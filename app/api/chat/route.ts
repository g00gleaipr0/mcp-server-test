/**
 * Chat API with MCP Tool Integration
 * 함수 호출을 직접 제어하여 실시간으로 호출 과정을 클라이언트에 전송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import {
  getAllToolsAsFunctionDeclarations,
  callMcpTool,
} from '@/lib/mcp/global-manager';
import type { ChatRequest, ChatResponseChunk } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ChatRequest;
    const { messages, mcpEnabled = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const lastMessage = messages[messages.length - 1];

    // 히스토리 포맷팅 (함수 호출 메시지 제외)
    const validHistory = messages
      .slice(0, -1)
      .filter((msg) => msg.content && msg.content.trim() !== '' && msg.role !== 'function');
    
    const history = validHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    console.log(`[Chat] Processing with ${history.length} history messages, MCP enabled: ${mcpEnabled}`);

    // MCP 도구 설정
    const functionDeclarations = mcpEnabled ? getAllToolsAsFunctionDeclarations() : [];
    console.log(`[Chat] Available tools: ${functionDeclarations.map(f => f.name).join(', ') || 'none'}`);

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendChunk = (chunk: ChatResponseChunk) => {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        };

        try {
          if (functionDeclarations.length > 0) {
            // MCP 도구가 있을 때 - 수동 함수 호출 제어
            await handleWithFunctionCalling(
              ai,
              history,
              lastMessage.content,
              functionDeclarations,
              sendChunk
            );
          } else {
            // MCP 도구가 없을 때 - 기존 스트리밍 방식
            console.log('[Chat] Using streaming without MCP tools');
            
            const chat = ai.chats.create({
              model: 'gemini-2.5-flash',
              history: history,
            });

            const resultStream = await chat.sendMessageStream({
              message: lastMessage.content,
            });

            for await (const chunk of resultStream) {
              const text = chunk.text;
              if (text) {
                sendChunk({ type: 'text', text });
              }
            }
          }
          
          sendChunk({ type: 'done' });
          controller.close();
        } catch (error) {
          console.error('[Chat] Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          sendChunk({ type: 'error', error: errorMessage });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: unknown) {
    console.error('[Chat] API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 함수 호출을 직접 제어하여 실시간으로 상태를 전송합니다.
 */
async function handleWithFunctionCalling(
  ai: GoogleGenAI,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  userMessage: string,
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>,
  sendChunk: (chunk: ChatResponseChunk) => void
): Promise<void> {
  console.log('[Chat] Using manual function calling');

  // 대화 내용 구성
  const contents = [
    ...history.map(h => ({
      role: h.role as 'user' | 'model',
      parts: h.parts,
    })),
    {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    },
  ];

  // 최대 함수 호출 반복 횟수 (무한 루프 방지)
  const maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[Chat] Function calling iteration ${iteration}`);

    // 모델 호출
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
      },
    });

    // 함수 호출이 있는지 확인
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      // 함수 호출 처리
      const functionResults: Array<{
        name: string;
        response: { result: string };
      }> = [];

      for (const fc of functionCalls) {
        const callId = uuidv4();
        const functionName = fc.name || 'unknown';
        const args = (fc.args || {}) as Record<string, unknown>;

        // 함수 호출 시작 알림
        sendChunk({
          type: 'function_call_start',
          functionCall: {
            id: callId,
            name: functionName,
            arguments: args,
            status: 'running',
          },
        });

        // 실제 MCP 도구 호출
        const result = await callMcpTool(functionName, args);

        // 함수 호출 완료 알림
        sendChunk({
          type: 'function_call_end',
          functionCall: {
            id: callId,
            name: functionName,
            arguments: args,
            result: result.success ? result.result : undefined,
            status: result.success ? 'success' : 'error',
            error: result.error,
          },
        });

        functionResults.push({
          name: functionName,
          response: { result: result.result || result.error || '' },
        });
      }

      // 모델 응답과 함수 결과를 대화에 추가
      // 함수 호출 응답 추가
      contents.push({
        role: 'model' as const,
        parts: functionCalls.map(fc => ({
          functionCall: {
            name: fc.name,
            args: fc.args,
          },
        })) as any,
      });

      // 함수 실행 결과 추가
      contents.push({
        role: 'user' as const,
        parts: functionResults.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response,
          },
        })) as any,
      });

    } else {
      // 함수 호출 없음 - 최종 텍스트 응답
      const responseText = response.text || '';
      if (responseText) {
        sendChunk({ type: 'text', text: responseText });
      }
      break;
    }
  }

  if (iteration >= maxIterations) {
    console.warn('[Chat] Max function calling iterations reached');
    sendChunk({ type: 'text', text: '(최대 함수 호출 횟수에 도달했습니다)' });
  }
}

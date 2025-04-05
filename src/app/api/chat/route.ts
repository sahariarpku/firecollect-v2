import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, papers } = await req.json();

    // Create a context from the papers
    const papersContext = papers
      .map((paper: any) => `Title: ${paper.title}\nAuthors: ${paper.authors}\nYear: ${paper.year}\nAbstract: ${paper.abstract}\n---`)
      .join('\n');

    // Add the papers context to the system message
    const systemMessage = {
      role: 'system',
      content: `You are a helpful research assistant. You have access to the following papers from the user's Zotero library. Use this information to answer questions about the papers, their content, and relationships between them. If you reference specific papers, include their titles in your response.

Available papers:
${papersContext}`
    };

    // Create the chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json({
      content: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { Component } from '@/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODIFY_ACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    action: {
      type: 'string',
      enum: ['rename', 'resize', 'move'],
      description: 'The type of modification to perform'
    },
    componentTitle: {
      type: 'string',
      description: 'The exact title of the component to modify (must match one of the component titles provided)'
    },
    newTitle: {
      type: 'string',
      description: 'The new title for the component (required only for rename action)'
    },
    newSize: {
      type: 'object',
      properties: {
        w: { type: 'number', description: 'New width in grid units (1-4)' },
        h: { type: 'number', description: 'New height in grid units (minimum 1)' }
      },
      required: ['w', 'h'],
      description: 'New size for the component (required only for resize action)'
    },
    direction: {
      type: 'string',
      enum: ['up', 'down'],
      description: 'Direction to move the component (required only for move action)'
    }
  },
  required: ['action', 'componentTitle'],
  additionalProperties: false
};

const SYSTEM_PROMPT = `You are a dashboard modification assistant. Your job is to understand user requests to modify dashboard components and return structured actions.

Available actions:
1. "rename" - Change the title of a component
   - Requires: componentTitle (current title), newTitle (new title)
   - Example: "rename Daily Active Users to DAU"

2. "resize" - Change the size of a component
   - Requires: componentTitle, newSize with w (width 1-4) and h (height minimum 1)
   - Example: "make the User Growth chart bigger" or "resize Daily Active Users to 2x3"
   - Default sizes: KPI (1x1), Charts (2x2), Table (4x2), Metrics Grid (4x1)

3. "move" - Move a component up or down in the layout
   - Requires: componentTitle, direction ('up' or 'down')
   - Example: "move Daily Active Users up" or "move the first chart down"

IMPORTANT:
- You must identify components by their EXACT title as provided in the components list
- For resize, if user says "bigger" or "smaller", infer reasonable new dimensions
- For move, "up" means earlier in the array (lower index), "down" means later (higher index)
- Grid layout: width is 1-4 units, height is minimum 1 unit
- Always return valid action types and required fields`;

export async function POST(request: NextRequest) {
  try {
    const { reportId, prompt, components } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: 'Components array is required' },
        { status: 400 }
      );
    }

    // Build context about available components
    const componentsContext = components.map((comp: Component, index: number) => {
      const layout = comp.layout ? ` (position: ${comp.layout.x},${comp.layout.y}, size: ${comp.layout.w}x${comp.layout.h})` : '';
      return `${index + 1}. "${comp.title}" - Type: ${comp.type}${layout}`;
    }).join('\n');

    const userMessage = `User request: "${prompt}"

Current dashboard components:
${componentsContext}

What action should be performed? Identify the component by its exact title and return the appropriate action.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ],
      tools: [
        {
          name: 'modify_component',
          description: 'Modify a dashboard component',
          input_schema: MODIFY_ACTION_SCHEMA
        }
      ],
      tool_choice: { type: 'tool', name: 'modify_component' }
    });

    // Extract the structured output from tool use
    const toolUseBlock = message.content.find((block) => block.type === 'tool_use');
    
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Failed to parse modification action' },
        { status: 500 }
      );
    }

    const actionData = toolUseBlock.input as Record<string, unknown>;
    
    console.log('LLM returned action data:', JSON.stringify(actionData, null, 2));

    // Validate the action data
    const actionSchema = z.object({
      action: z.enum(['rename', 'resize', 'move']),
      componentTitle: z.string(),
      newTitle: z.string().optional().nullable(),
      newSize: z.object({
        w: z.number().min(1).max(4),
        h: z.number().min(1)
      }).optional().nullable(),
      direction: z.enum(['up', 'down']).optional().nullable()
    });

    const validationResult = actionSchema.safeParse(actionData);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Invalid action data',
          details: validationResult.error.issues,
          received: actionData
        },
        { status: 422 }
      );
    }

    const validatedAction = validationResult.data;
    
    // Normalize null values to undefined
    const normalizedAction = {
      action: validatedAction.action,
      componentTitle: validatedAction.componentTitle,
      newTitle: validatedAction.newTitle || undefined,
      newSize: validatedAction.newSize || undefined,
      direction: validatedAction.direction || undefined
    };

    // Validate action-specific requirements
    if (normalizedAction.action === 'rename' && !normalizedAction.newTitle) {
      return NextResponse.json(
        { error: 'newTitle is required for rename action' },
        { status: 422 }
      );
    }

    if (normalizedAction.action === 'resize' && !normalizedAction.newSize) {
      return NextResponse.json(
        { error: 'newSize is required for resize action' },
        { status: 422 }
      );
    }

    if (normalizedAction.action === 'move' && !normalizedAction.direction) {
      return NextResponse.json(
        { error: 'direction is required for move action' },
        { status: 422 }
      );
    }

    // Verify component exists - try exact match first, then case-insensitive
    let componentIndex = components.findIndex(
      (comp: Component) => comp.title === normalizedAction.componentTitle
    );
    
    // If not found, try case-insensitive match
    if (componentIndex === -1) {
      componentIndex = components.findIndex(
        (comp: Component) => comp.title.toLowerCase() === normalizedAction.componentTitle.toLowerCase()
      );
    }
    
    // If still not found, try partial match
    if (componentIndex === -1) {
      componentIndex = components.findIndex(
        (comp: Component) => comp.title.toLowerCase().includes(normalizedAction.componentTitle.toLowerCase()) ||
          normalizedAction.componentTitle.toLowerCase().includes(comp.title.toLowerCase())
      );
    }

    if (componentIndex === -1) {
      return NextResponse.json(
        { 
          error: `Component "${normalizedAction.componentTitle}" not found`,
          availableComponents: components.map((c: Component) => c.title)
        },
        { status: 404 }
      );
    }
    
    const matchedTitle = components[componentIndex].title;

    return NextResponse.json({
      action: normalizedAction.action,
      componentTitle: matchedTitle,
      componentIndex,
      newTitle: normalizedAction.newTitle,
      newSize: normalizedAction.newSize,
      direction: normalizedAction.direction,
      message: `Action parsed: ${normalizedAction.action} on "${matchedTitle}"`
    });

  } catch (error) {
    console.error('Error parsing modification action:', error);
    
    return NextResponse.json(
      { error: 'Failed to parse modification action' },
      { status: 500 }
    );
  }
}


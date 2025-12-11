import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { reportConfigSchema, ANTHROPIC_JSON_SCHEMA } from '@/lib/schemas';
import { z } from 'zod';
import { getSchemaForPrompt } from '@/lib/schema-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_BASE = `You are an analytics report configuration generator. Your job is to convert user requests into JSON configurations with SQL queries for analytics components.

Current date: {{NOW}}
Use this date to calculate relative date ranges and understand time-based requests.

{{SCHEMA}}

IMPORTANT: You must generate a valid PostgreSQL SQL query for each component. The query should return data in the correct format for each component type.

Available components and their required SQL output format:

1. "kpi" - Single metric display card
   - SQL must return: A single row with a "value" column
   - Example SQL: SELECT COUNT(DISTINCT id) as value FROM users WHERE created_at >= '2024-01-01'

2. "line_chart" - Time-series line graph
   - SQL must return: Rows with "date" and "value" columns, ordered by date
   - Example SQL: SELECT DATE(created_at) as date, COUNT(*) as value FROM users WHERE created_at >= '2024-01-01' GROUP BY DATE(created_at) ORDER BY date

3. "bar_chart" - Vertical bar chart
   - SQL must return: Rows with "label" and "value" columns
   - Example SQL: SELECT action as label, COUNT(*) as value FROM events GROUP BY action ORDER BY value DESC

4. "table" - Tabular data display
   - SQL must return: Rows with columns matching the "columns" array
   - Example SQL: SELECT email, company_size, created_at FROM users ORDER BY created_at DESC LIMIT 100

5. "metrics_grid" - Grid of multiple KPI cards
   - Each metric needs its own SQL query in the "metrics" array
   - Each SQL must return: A single row with a "value" column

6. "pie_chart" / "donut_chart" - Circular charts showing proportions
   - SQL must return: Rows with "name" and "value" columns
   - Example SQL: SELECT action as name, COUNT(*) as value FROM events GROUP BY action

7. "area_chart" - Filled area chart
   - SQL must return: Rows with "date" and "value" columns, ordered by date
   - Same format as line_chart

8. "scatter_chart" - Scatter plot
   - SQL must return: Rows with "x" and "y" columns
   - Example SQL: SELECT company_size as x, COUNT(*) as y FROM users GROUP BY company_size

9. "horizontal_bar_chart" - Horizontal bars
   - SQL must return: Rows with "label" and "value" columns
   - Same format as bar_chart

SQL Query Guidelines:
- Use only SELECT statements (no INSERT, UPDATE, DELETE, etc.)
- Reference only tables and columns from the schema above
- Use appropriate date filtering based on the user's request
- Use proper PostgreSQL syntax
- Always alias columns to match the expected output format (value, date, label, name, x, y)
- For date grouping, use DATE(), DATE_TRUNC('week', ...), DATE_TRUNC('month', ...), etc.
- Include ORDER BY for time-series data
- Use LIMIT for table queries to prevent too much data

You must respond with ONLY valid JSON in this format:
{
  "reportName": "descriptive report name",
  "components": [
    {
      "type": "component_type",
      "title": "Component Title",
      "query": "SELECT ... FROM ... WHERE ...",
      // other fields based on component type
    }
  ]
}

Examples:

User: "Show me daily active users for the last week"
Response:
{
  "reportName": "Daily Active Users - Last 7 Days",
  "components": [
    {
      "type": "kpi",
      "title": "Total Active Users",
      "query": "SELECT COUNT(DISTINCT user_id) as value FROM events WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'"
    },
    {
      "type": "line_chart",
      "title": "DAU Trend",
      "query": "SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as value FROM events WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY date"
    }
  ]
}

User: "Show me event distribution by type"
Response:
{
  "reportName": "Event Type Distribution",
  "components": [
    {
      "type": "pie_chart",
      "title": "Events by Type",
      "query": "SELECT action as name, COUNT(*) as value FROM events WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days' GROUP BY action"
    }
  ]
}

User: "Show me user signups by company size"
Response:
{
  "reportName": "User Signups by Company Size",
  "components": [
    {
      "type": "bar_chart",
      "title": "Users by Company Size",
      "query": "SELECT CASE WHEN company_size < 10 THEN 'Small' WHEN company_size < 100 THEN 'Medium' ELSE 'Large' END as label, COUNT(*) as value FROM users GROUP BY label ORDER BY value DESC"
    }
  ]
}

User: "Show me recent users"
Response:
{
  "reportName": "Recent Users",
  "components": [
    {
      "type": "table",
      "title": "Latest Signups",
      "columns": ["email", "company_size", "created_at"],
      "query": "SELECT email, company_size, created_at FROM users ORDER BY created_at DESC LIMIT 50"
    }
  ]
}

User: "Show me subscription metrics"
Response:
{
  "reportName": "Subscription Overview",
  "components": [
    {
      "type": "metrics_grid",
      "title": "Subscription Metrics",
      "metrics": [
        { "label": "Total Subscriptions", "query": "SELECT COUNT(*) as value FROM subscriptions" },
        { "label": "Active Subscriptions", "query": "SELECT COUNT(*) as value FROM subscriptions WHERE status = 'active'" },
        { "label": "Canceled", "query": "SELECT COUNT(*) as value FROM subscriptions WHERE status = 'canceled'" }
      ]
    }
  ]
}

Guidelines:
- Choose the visualization that best represents the data type and user intent
- Always include a valid SQL query for each component
- Use the database schema to write accurate queries
- Use appropriate date intervals based on user request
- Alias columns correctly for each component type

Report editing context (for follow-up commands on existing reports):
- Layout is managed by a drag/resize grid (react-grid-layout). Each component has layout fields { x, y, w, h } that persist to Supabase when layout changes.
- Moving/resizing is done by dragging the component's top .drag-handle; changes are auto-saved via onLayoutChange -> saveLayoutToDatabase updating reports.component_config.components[i].layout and updated_at.
- Report renaming calls updateReportName, which writes reports.name and updated_at in Supabase.
- If the user asks to move, resize, or rename charts, acknowledge and describe the action referencing these behaviors (e.g., drag handle for position/size; rename updates report name).

Editing tools you can reference when users ask for changes on an existing report page:
- rename_report(new_name): updates report title via updateReportName (writes reports.name and updated_at).
- move_chart(title, direction): direction is "up" or "down"; simulate dragging the component's .drag-handle to adjust its layout.y and persist via onLayoutChange/saveLayoutToDatabase.
- resize_chart(title, w, h): simulate resize of the component, updating layout.w and layout.h and persisting via onLayoutChange/saveLayoutToDatabase.
`;

const MAX_RETRIES = 3;

const VERIFICATION_PROMPT = `You are a quality assurance agent reviewing analytics report configurations.

Your job is to verify that the generated report configuration correctly answers the user's original request.

Evaluate:
1. Does the report include all components needed to answer the user's question?
2. Are the metrics appropriate for what the user asked?
3. Are the date ranges sensible for the user's request?
4. Are the visualization types appropriate for the data being shown?
5. Is the report name descriptive and accurate?

Respond with a JSON object:
{
  "isValid": true/false,
  "feedback": "Explanation of issues if invalid, or confirmation if valid",
  "suggestions": ["specific improvements if needed"]
}`;

async function verifyReportConfig(
  userPrompt: string, 
  config: { reportName: string; components: unknown[] }
): Promise<{ isValid: boolean; feedback: string; suggestions: string[] }> {
  try {
    const verificationMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: VERIFICATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Original user request: "${userPrompt}"

Generated configuration:
${JSON.stringify(config, null, 2)}

Is this configuration correct and appropriate for the user's request?`
        }
      ]
    });

    const responseText = verificationMessage.content[0].type === 'text' 
      ? verificationMessage.content[0].text 
      : '';
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const verification = JSON.parse(jsonMatch[0]);
      return {
        isValid: verification.isValid ?? false,
        feedback: verification.feedback ?? 'No feedback provided',
        suggestions: verification.suggestions ?? []
      };
    }

    // Fallback if parsing fails
    return {
      isValid: true, // Default to accepting if verification fails to parse
      feedback: 'Verification completed',
      suggestions: []
    };
  } catch (error) {
    console.warn('Verification failed, accepting config:', error);
    // If verification fails, accept the config (better than blocking)
    return {
      isValid: true,
      feedback: 'Verification step skipped due to error',
      suggestions: []
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Inject current date and schema into system prompt
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const schemaPrompt = getSchemaForPrompt();
    const systemPrompt = SYSTEM_PROMPT_BASE
      .replace('{{NOW}}', now)
      .replace('{{SCHEMA}}', schemaPrompt);

    // Retry loop with validation feedback
    let lastValidationError: z.ZodError | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Build messages array with validation feedback if this is a retry
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
          {
            role: 'user',
            content: prompt,
          }
        ];

        // If we had a validation error, add feedback for retry
        if (lastValidationError && attempt > 0) {
          const errorDetails = lastValidationError.issues.map((err: z.ZodIssue) => 
            `- ${err.path.join('.')}: ${err.message}`
          ).join('\n');

          messages.push({
            role: 'assistant',
            content: 'Let me try again with the correct format.'
          });
          messages.push({
            role: 'user',
            content: `The previous configuration had validation errors. Please fix these issues and regenerate:\n\n${errorDetails}\n\nGenerate a valid configuration that addresses all these errors.`
          });
        }

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          system: systemPrompt,
          messages,
          tools: [
            {
              name: 'generate_report_config',
              description: 'Generate a valid report configuration with components',
              input_schema: ANTHROPIC_JSON_SCHEMA,
            }
          ],
          tool_choice: { type: 'tool', name: 'generate_report_config' }
        });

        // Extract the structured output from tool use
        const toolUseBlock = message.content.find((block) => block.type === 'tool_use');
        
        if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
          throw new Error('No tool use block found in response');
        }

        const rawConfig = toolUseBlock.input;

        // Validate the configuration with Zod
        const validationResult = reportConfigSchema.safeParse(rawConfig);

        if (!validationResult.success) {
          lastValidationError = validationResult.error;
          console.warn(`Validation failed on attempt ${attempt + 1}/${MAX_RETRIES}:`, validationResult.error.issues);
          
          // If this was the last attempt, return error
          if (attempt === MAX_RETRIES - 1) {
            return NextResponse.json(
              { 
                error: 'Generated configuration is invalid after multiple attempts',
                details: validationResult.error.issues.map((err: z.ZodIssue) => ({
                  path: err.path.join('.'),
                  message: err.message
                })),
                attempts: MAX_RETRIES
              },
              { status: 422 }
            );
          }
          
          // Continue to next retry
          continue;
        }

        // Success! Configuration is structurally valid
        const config = validationResult.data;

        // Now verify semantic correctness with a verification agent
        const verification = await verifyReportConfig(prompt, config);

        if (!verification.isValid) {
          console.warn(`Semantic verification failed on attempt ${attempt + 1}:`, verification.feedback);
          
          // If this was the last attempt, return error with verification feedback
          if (attempt === MAX_RETRIES - 1) {
            return NextResponse.json(
              { 
                error: 'Generated configuration did not pass quality verification',
                feedback: verification.feedback,
                suggestions: verification.suggestions,
                attempts: MAX_RETRIES
              },
              { status: 422 }
            );
          }
          
          // Add verification feedback to messages for next attempt
          lastValidationError = new z.ZodError([
            {
              code: 'custom',
              path: ['verification'],
              message: `Verification failed: ${verification.feedback}. Suggestions: ${verification.suggestions.join(', ')}`
            }
          ]) as z.ZodError;
          
          // Continue to next retry with verification feedback
          continue;
        }

        console.log(`Report generated and verified successfully on attempt ${attempt + 1}`);

        return NextResponse.json({
          config: { components: config.components },
          reportName: config.reportName,
          message: `Created report: ${config.reportName}`,
          attempts: attempt + 1,
          verified: true,
          verificationFeedback: verification.feedback
        });

      } catch (innerError) {
        // If this is the last attempt, throw to outer catch
        if (attempt === MAX_RETRIES - 1) {
          throw innerError;
        }
        // Otherwise, log and retry
        console.warn(`Attempt ${attempt + 1} failed:`, innerError);
      }
    }

    // Should never reach here, but just in case
    throw new Error('Failed to generate valid configuration');

  } catch (error) {
    console.error('Error generating report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate report configuration' },
      { status: 500 }
    );
  }
}

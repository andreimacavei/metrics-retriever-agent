import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { reportConfigSchema, ANTHROPIC_JSON_SCHEMA } from '@/lib/schemas';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_BASE = `You are an analytics report configuration generator. Your job is to convert user requests into JSON configurations for predefined analytics components.

Current date: {{NOW}}
Use this date to calculate relative date ranges and understand time-based requests.

Available components:
1. "kpi" - Single metric display card showing one key metric value prominently
   - Use for: Single important numbers like total users, revenue, conversion rate
   - Fields: type, title, metric, dateRange
   - Example: "Total Active Users: 1,234"

2. "line_chart" - Time-series line graph visualization
   - Use for: Trends over time, showing progression and patterns
   - Fields: type, title, xAxis, yAxis, dateRange, groupBy
   - Example: Daily user signups over the last 30 days

3. "bar_chart" - Vertical bar chart for categorical comparison
   - Use for: Comparing values across different categories or time periods
   - Fields: type, title, xAxis, yAxis, dateRange, groupBy
   - Example: Event counts by type, monthly revenue comparison

4. "table" - Tabular data display with rows and columns
   - Use for: Detailed data with multiple attributes, lists of items
   - Fields: type, title, columns, dateRange
   - Example: Top 10 users with their activity metrics

5. "metrics_grid" - Grid of multiple KPI cards displayed together
   - Use for: Dashboard overview with several key metrics at once
   - Fields: type, title, metrics (array of {label, metric})
   - Example: Overview showing DAU, WAU, MAU, and conversion rate

6. "pie_chart" - Circular chart showing parts of a whole with percentages
   - Use for: Distribution and composition, showing proportions
   - Fields: type, title, nameKey, valueKey, dateRange
   - Example: User distribution by country, revenue by product category

7. "area_chart" - Filled area chart showing volume over time
   - Use for: Cumulative values, showing magnitude and trends together
   - Fields: type, title, xAxis, yAxis, dateRange, groupBy
   - Example: Total revenue accumulated over time, page views trend

8. "donut_chart" - Ring-shaped chart (pie chart with center hole) showing proportions
   - Use for: Similar to pie chart but more modern, showing parts with percentages
   - Fields: type, title, nameKey, valueKey, dateRange
   - Example: Traffic sources breakdown, user type distribution

9. "scatter_chart" - Scatter plot showing relationship between two variables
   - Use for: Correlation analysis, identifying patterns between metrics
   - Fields: type, title, xAxis, yAxis, dateRange
   - Example: Session duration vs bounce rate, user age vs purchase amount

10. "horizontal_bar_chart" - Horizontal bars for category comparison
    - Use for: Ranking, comparing many categories (better for long labels)
    - Fields: type, title, xAxis, yAxis, dateRange
    - Example: Top 10 pages by views, products ranked by sales

Available metrics:
- count_distinct_users: Count unique users
- count_events: Count total events
- avg_session_duration: Average session length
- daily_active_users: Daily active users
- weekly_active_users: Weekly active users
- monthly_active_users: Monthly active users

Date ranges:
You can use either predefined ranges or custom date ranges:
- Predefined: last_7_days, last_30_days, last_90_days, this_month, last_month
- Custom: { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } (e.g., { "start": "2024-01-01", "end": "2024-01-31" })

Group by options:
- day, week, month, hour

You must respond with ONLY valid JSON in this format:
{
  "reportName": "descriptive report name",
  "components": [
    {
      "type": "component_type",
      "title": "Component Title",
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
      "metric": "count_distinct_users",
      "dateRange": "last_7_days"
    },
    {
      "type": "line_chart",
      "title": "DAU Trend",
      "xAxis": "date",
      "yAxis": "count_distinct_users",
      "dateRange": "last_7_days",
      "groupBy": "day"
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
      "nameKey": "event_name",
      "valueKey": "count",
      "dateRange": "last_30_days"
    }
  ]
}

User: "Compare users across segments"
Response:
{
  "reportName": "User Segment Analysis",
  "components": [
    {
      "type": "donut_chart",
      "title": "User Segments",
      "nameKey": "segment",
      "valueKey": "users",
      "dateRange": "last_30_days"
    },
    {
      "type": "horizontal_bar_chart",
      "title": "Segment Rankings",
      "xAxis": "count",
      "yAxis": "segment",
      "dateRange": "last_30_days"
    }
  ]
}

User: "Show me Q1 2024 performance"
Response:
{
  "reportName": "Q1 2024 Performance",
  "components": [
    {
      "type": "kpi",
      "title": "Total Users",
      "metric": "count_distinct_users",
      "dateRange": { "start": "2024-01-01", "end": "2024-03-31" }
    },
    {
      "type": "line_chart",
      "title": "Daily Active Users",
      "xAxis": "date",
      "yAxis": "count_distinct_users",
      "groupBy": "day",
      "dateRange": { "start": "2024-01-01", "end": "2024-03-31" }
    }
  ]
}

Guidelines:
- Choose the visualization that best represents the data type and user intent
- Use KPIs for single important numbers
- Use line/area charts for trends over time
- Use bar charts for comparisons across categories
- Use pie/donut charts for proportions and distributions
- Use scatter charts when exploring relationships between two metrics
- Use tables for detailed multi-column data
- Use metrics_grid for dashboard overviews with multiple KPIs
- When user specifies specific dates or quarters, use custom dateRange with start/end
- When user asks for relative periods (last week, last month), use predefined dateRange values
- Use the current date ({{NOW}}) to calculate custom date ranges for specific time periods`;

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

    // Inject current date into system prompt
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const systemPrompt = SYSTEM_PROMPT_BASE.replace('{{NOW}}', now);

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

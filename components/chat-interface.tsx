'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ChatMessage } from '@/lib/types';
import { Send, Sparkles, TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';

import { Report } from '@/lib/types';

interface ChatInterfaceProps {
  onReportGenerated: (reportName: string, config: Report['component_config']) => void;
}

const ALL_EXAMPLE_PROMPTS = [
  {
    icon: Users,
    title: 'Daily Active Users',
    prompt: 'Show me daily active users for the last 7 days with a trend chart',
  },
  {
    icon: TrendingUp,
    title: 'User Growth',
    prompt: 'Create a report showing user growth and retention metrics for the past month',
  },
  {
    icon: Activity,
    title: 'Event Analytics',
    prompt: 'Display top events with a breakdown by event type for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'Activity Breakdown',
    prompt: 'Show me a comprehensive breakdown of user activity by day and event type',
  },
  {
    icon: Users,
    title: 'Weekly Active Users',
    prompt: 'Show weekly active users for the last 3 months',
  },
  {
    icon: TrendingUp,
    title: 'Monthly User Trends',
    prompt: 'Display monthly active user trends for the last 90 days',
  },
  {
    icon: Activity,
    title: 'Event Frequency',
    prompt: 'Show me event frequency by hour for the last 7 days',
  },
  {
    icon: BarChart3,
    title: 'User Engagement',
    prompt: 'Create a report showing user engagement metrics for this month',
  },
  {
    icon: Users,
    title: 'New User Signups',
    prompt: 'Display new user signups by day for the last 30 days',
  },
  {
    icon: TrendingUp,
    title: 'Retention Analysis',
    prompt: 'Show user retention rates over the last month',
  },
  {
    icon: Activity,
    title: 'Page View Analytics',
    prompt: 'Display page view counts and trends for the last week',
  },
  {
    icon: BarChart3,
    title: 'Session Duration',
    prompt: 'Show average session duration by day for the last 30 days',
  },
  {
    icon: Users,
    title: 'Active User Comparison',
    prompt: 'Compare daily, weekly, and monthly active users for the last 90 days',
  },
  {
    icon: TrendingUp,
    title: 'Growth Rate',
    prompt: 'Calculate and display user growth rate for the past month',
  },
  {
    icon: Activity,
    title: 'Event Types Breakdown',
    prompt: 'Show me all event types and their distribution for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'Hourly Activity',
    prompt: 'Display hourly user activity patterns for the last 7 days',
  },
  {
    icon: Users,
    title: 'User Activity Heat Map',
    prompt: 'Create a heat map of user activity by day and hour',
  },
  {
    icon: TrendingUp,
    title: 'Conversion Trends',
    prompt: 'Show conversion event trends for the last month',
  },
  {
    icon: Activity,
    title: 'Top User Actions',
    prompt: 'Display the top 10 user actions for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'Weekly Engagement',
    prompt: 'Show weekly engagement metrics with week-over-week comparison',
  },
  {
    icon: Users,
    title: 'User Cohort Analysis',
    prompt: 'Create a cohort analysis report for users from the last 3 months',
  },
  {
    icon: TrendingUp,
    title: 'Acquisition Channels',
    prompt: 'Display user acquisition metrics by channel for the last month',
  },
  {
    icon: Activity,
    title: 'Button Click Analytics',
    prompt: 'Show button click events and their frequency for the last 7 days',
  },
  {
    icon: BarChart3,
    title: 'Daily Event Volume',
    prompt: 'Display daily event volume with trends for the last 30 days',
  },
  {
    icon: Users,
    title: 'Returning Users',
    prompt: 'Show returning vs new users breakdown for the last month',
  },
  {
    icon: TrendingUp,
    title: 'User Lifecycle',
    prompt: 'Create a user lifecycle report with activation and retention metrics',
  },
  {
    icon: Activity,
    title: 'Form Submissions',
    prompt: 'Display form submission events by type for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'Peak Usage Times',
    prompt: 'Show peak usage times and patterns for the last week',
  },
  {
    icon: Users,
    title: 'Active Users by Hour',
    prompt: 'Display active users broken down by hour of day',
  },
  {
    icon: TrendingUp,
    title: 'Month-over-Month Growth',
    prompt: 'Show month-over-month user growth for the last 3 months',
  },
  {
    icon: Activity,
    title: 'Event Success Rate',
    prompt: 'Calculate event success rates for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'User Segmentation',
    prompt: 'Create a user segmentation report based on activity levels',
  },
  {
    icon: Users,
    title: 'Login Activity',
    prompt: 'Show login events and frequency for the last 7 days',
  },
  {
    icon: TrendingUp,
    title: 'Churn Analysis',
    prompt: 'Display user churn metrics and trends for the last month',
  },
  {
    icon: Activity,
    title: 'Purchase Events',
    prompt: 'Show purchase events with trends for the last 30 days',
  },
  {
    icon: BarChart3,
    title: 'Activity by Day of Week',
    prompt: 'Display user activity patterns by day of week',
  },
  {
    icon: Users,
    title: 'User Count Overview',
    prompt: 'Show total user count with growth indicators',
  },
  {
    icon: TrendingUp,
    title: 'Engagement Rate',
    prompt: 'Calculate and display user engagement rate for the last month',
  },
  {
    icon: Activity,
    title: 'Event Timeline',
    prompt: 'Create a timeline of all events for the last 7 days',
  },
  {
    icon: BarChart3,
    title: 'User Sessions',
    prompt: 'Show user session counts and duration for the last 30 days',
  },
  {
    icon: Users,
    title: 'First-Time Users',
    prompt: 'Display first-time user metrics for the last month',
  },
  {
    icon: TrendingUp,
    title: 'Activation Funnel',
    prompt: 'Show user activation funnel metrics for the last 30 days',
  },
  {
    icon: Activity,
    title: 'Custom Event Tracking',
    prompt: 'Display custom events with counts for the last week',
  },
  {
    icon: BarChart3,
    title: 'Activity Comparison',
    prompt: 'Compare this month activity with last month',
  },
];

const THINKING_MESSAGES = [
  'Analyzing your request...',
  'Crafting your report...',
  'Percolating insights...',
  'Configuring components...',
  'Almost there...',
];

export function ChatInterface({ onReportGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [examplePrompts, setExamplePrompts] = useState(ALL_EXAMPLE_PROMPTS.slice(0, 4));

  // Randomly select 4 prompts from the pool on client side only
  useEffect(() => {
    const shuffled = [...ALL_EXAMPLE_PROMPTS].sort(() => Math.random() - 0.5);
    setExamplePrompts(shuffled.slice(0, 4));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading) {
      let messageIndex = 0;
      setThinkingMessage(THINKING_MESSAGES[0]);

      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % THINKING_MESSAGES.length;
        setThinkingMessage(THINKING_MESSAGES[messageIndex]);
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isLoading]);


  const sendMessage = async (prompt?: string) => {
    const messageContent = prompt || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageContent,
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('voice-tts', { detail: { text: 'Now generating the report' } })
        );
      }

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: messageContent }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'Report generated successfully!',
      };

      setMessages([...messages, userMessage, assistantMessage]);

      if (data.config) {
        onReportGenerated(data.reportName, data.config);
      }

      if (typeof window !== 'undefined') {
        const doneText = data?.reportName
          ? `Report ${data.reportName} is ready`
          : 'Your report is ready';
        window.dispatchEvent(
          new CustomEvent('voice-tts', { detail: { text: doneText } })
        );
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, there was an error generating your report. Please try again.',
      };
      setMessages([...messages, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!text) return;
      setInput((prev) => (prev ? `${prev} ${text}` : text));
      void sendMessage(text);
    };
    window.addEventListener('voice-transcript', handler as EventListener);
    return () => window.removeEventListener('voice-transcript', handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <div className="flex flex-col h-full">
      {messages.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="max-w-4xl w-full space-y-10 md:space-y-12">
            {/* Header */}
            <div className="text-center space-y-3 md:space-y-4 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 mb-4 md:mb-6 shadow-lg shadow-primary/10">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Create Analytics Report</h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Describe your report, and AI will build it instantly
              </p>
            </div>

            {/* Example Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
              {examplePrompts.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setInput(example.prompt)}
                    className="group p-5 md:p-6 text-left border border-border/60 rounded-lg hover:border-primary/40 hover:bg-accent/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-all flex-shrink-0">
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors text-base md:text-lg">
                          {example.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground line-clamp-2">
                          {example.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Input Field */}
            <div className="flex gap-3 max-w-2xl mx-auto px-4">
              <Input
                placeholder="Describe your analytics report..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
                className="h-12 md:h-14 text-base md:text-lg px-5 shadow-sm"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                size="lg"
                className="px-6 md:px-8 h-12 md:h-14"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 p-6 md:p-8" ref={scrollRef}>
            <div className="space-y-5 max-w-4xl mx-auto py-6 md:py-10">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`p-4 md:p-5 max-w-[85%] md:max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'bg-card border-border/60 shadow-md'
                    }`}
                  >
                    <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </Card>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <Card className="p-4 md:p-5 bg-card border-border/60 shadow-md">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm md:text-base text-muted-foreground">{thinkingMessage}</span>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border/60 p-5 md:p-6 bg-background/95 backdrop-blur-sm shadow-lg">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <Input
                placeholder="Describe your analytics report..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
                className="h-12 md:h-14 text-base md:text-lg px-5 shadow-sm"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                size="lg"
                className="px-6 md:px-8 h-12 md:h-14"
              >
                {isLoading ? (
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}

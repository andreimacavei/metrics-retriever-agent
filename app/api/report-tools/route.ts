import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

type Action = 'rename_report' | 'move_chart' | 'resize_chart' | 'rename_chart';
type Direction = 'up' | 'down';

interface MoveResizePayload {
  reportId: string;
  title: string;
  direction?: Direction;
  w?: number;
  h?: number;
}

interface RenameReportPayload {
  reportId: string;
  newName: string;
}

interface RenameChartPayload {
  reportId: string;
  title: string;
  newTitle: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await req.json();
    const action: Action = body.action;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'rename_report') {
      const { reportId, newName } = body as RenameReportPayload;
      if (!reportId || !newName?.trim()) {
        return NextResponse.json(
          { error: 'reportId and newName are required' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('reports')
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'move_chart' || action === 'resize_chart' || action === 'rename_chart') {
      const { reportId, title, direction, w, h, newTitle } = body as MoveResizePayload &
        RenameChartPayload;
      if (!reportId || !title?.trim()) {
        return NextResponse.json(
          { error: 'reportId and title are required' },
          { status: 400 }
        );
      }

      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (fetchError || !report) {
        return NextResponse.json(
          { error: fetchError?.message || 'Report not found' },
          { status: 404 }
        );
      }

      const components = report.component_config?.components;
      if (!Array.isArray(components)) {
        return NextResponse.json({ error: 'Invalid component config' }, { status: 400 });
      }

      const index = components.findIndex(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => typeof c?.title === 'string' && c.title.trim() === title.trim()
      );

      if (index === -1) {
        return NextResponse.json({ error: 'Component not found' }, { status: 404 });
      }

      if (action === 'move_chart') {
        if (!direction || !['up', 'down'].includes(direction)) {
          return NextResponse.json(
            { error: 'direction must be "up" or "down"' },
            { status: 400 }
          );
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= components.length) {
          return NextResponse.json({ error: 'Cannot move further' }, { status: 400 });
        }

        [components[index], components[targetIndex]] = [
          components[targetIndex],
          components[index]
        ];
      }

      if (action === 'resize_chart') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comp: any = components[index];
        comp.layout = comp.layout || { x: 0, y: 0, w: 2, h: 2 };
        if (typeof w === 'number') {
          comp.layout.w = clamp(w, 1, 4);
        }
        if (typeof h === 'number') {
          comp.layout.h = clamp(h, 1, 10);
        }
        components[index] = comp;
      }

      if (action === 'rename_chart') {
        if (!newTitle?.trim()) {
          return NextResponse.json({ error: 'newTitle is required' }, { status: 400 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comp: any = components[index];
        comp.title = newTitle.trim();
        components[index] = comp;
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          component_config: { components },
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, components });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('report-tools error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


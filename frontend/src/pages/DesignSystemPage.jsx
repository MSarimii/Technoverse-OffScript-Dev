import { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  Badge,
  StatusChip,
  ProgressRing,
  Skeleton,
  EmptyState,
  ErrorState,
  Tabs,
  Dialog,
  Drawer,
  Popover,
  Tooltip,
  Table,
} from '../components/ui';
import { PageHeader } from '../components/layout/AppLayout';
import { Bell, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const DesignSystemPage = () => {
  const [sw, setSw] = useState(true);
  const [tab, setTab] = useState('one');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <PageHeader
        title="SEMS Design System (Dev QA)"
        subtitle="Visual verification of all Appendix A primitives and interactive states."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: '_design' }]}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-mono uppercase text-ink-muted">Buttons & IconButton</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Notifications" onClick={() => toast.success('Toast works!')}>
            <Bell className="w-4 h-4" />
          </IconButton>
          <IconButton label="Add item" variant="primary">
            <Plus className="w-4 h-4" />
          </IconButton>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Default Input" placeholder="Enter value..." />
        <Input label="Error Input" error="Validation failed for this field." defaultValue="bad@" />
        <Textarea label="Textarea" placeholder="Written response..." />
        <Select label="Select">
          <option value="1">Difficulty 1 — Easy</option>
          <option value="2">Difficulty 2 — Medium</option>
        </Select>
        <div className="flex items-center gap-4">
          <Checkbox label="Checkbox" defaultChecked />
          <Radio label="Radio A" name="qa-r" defaultChecked />
          <Switch checked={sw} onChange={setSw} label="Switch" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono uppercase text-ink-muted">Badges, StatusChip & ProgressRing</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="cobalt">Cobalt</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <StatusChip status="saved" />
          <StatusChip status="saving" />
          <StatusChip status="offline" label="Offline (2 queued)" />
          <StatusChip status="retrying" />
          <StatusChip status="error" />
          <ProgressRing progress={0.72} className="text-cobalt" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono uppercase text-ink-muted">Tabs, Overlays & Table</h2>
        <Tabs
          items={[
            { key: 'one', label: 'Tab One' },
            { key: 'two', label: 'Tab Two' },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
        <div className="flex flex-wrap gap-3 items-center relative">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open Dialog</Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
          <Button variant="secondary" onClick={() => setPopoverOpen((v) => !v)}>Toggle Popover</Button>
          <Tooltip label="Keyboard accessible tooltip">
            <Button variant="ghost">Hover for Tooltip</Button>
          </Tooltip>
          <Popover open={popoverOpen} className="absolute top-12 left-0 z-30">
            <p className="text-xs font-mono">Popover content</p>
          </Popover>
        </div>
        <Table
          columns={[
            { key: 'id', header: 'ID' },
            { key: 'topic', header: 'Topic' },
            { key: 'status', header: 'Status' },
          ]}
          rows={[
            { id: 'Q-01', topic: 'DSA', status: 'Published' },
            { id: 'Q-02', topic: 'Databases', status: 'Draft' },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2 p-4 bg-surface border border-line rounded-xl">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <EmptyState title="No items" description="Create your first question to begin." />
        <ErrorState message="Request timed out." onRetry={() => toast.info('Retrying...')} />
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Dialog Primitive">
        <p className="text-sm text-ink-muted">Supports Escape key close and aria-modal.</p>
      </Dialog>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer Primitive">
        <p className="text-xs text-ink-muted">Responsive bottom-sheet on mobile, side panel on desktop.</p>
      </Drawer>
    </main>
  );
};

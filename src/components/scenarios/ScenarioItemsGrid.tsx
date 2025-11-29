import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Shield,
  Edit2,
  Plane,
} from 'lucide-react';
import type { ScenarioItem } from '@/hooks/useScenarios';
import { LocalAdjustmentDialog } from './LocalAdjustmentDialog';

interface ScenarioItemsGridProps {
  items: ScenarioItem[];
  totalItems: number;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  filters: {
    priorityBand?: string;
    entityId?: string;
    categoryId?: string;
    showCutOnly?: boolean;
  };
  onFiltersChange: (filters: any) => void;
  scenarioId: string;
  isEditable: boolean;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function ScenarioItemsGrid({
  items,
  totalItems,
  isLoading,
  page,
  onPageChange,
  filters,
  onFiltersChange,
  scenarioId,
  isEditable,
}: ScenarioItemsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustItem, setAdjustItem] = useState<ScenarioItem | null>(null);
  const pageSize = 50;
  const totalPages = Math.ceil(totalItems / pageSize);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDelta = (value: number, isPercentage = false) => {
    const formatted = isPercentage 
      ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
      : `${value > 0 ? '+' : ''}${value}`;
    return formatted;
  };

  const filteredItems = items.filter(item => 
    !searchQuery || 
    item.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.entity_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Plan Items</CardTitle>
          <Badge variant="outline">{totalItems} items</Badge>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select 
            value={filters.priorityBand || 'all'} 
            onValueChange={(v) => onFiltersChange({ ...filters, priorityBand: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-3">
            <Checkbox
              id="show-cut"
              checked={filters.showCutOnly || false}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, showCutOnly: !!checked })}
            />
            <label htmlFor="show-cut" className="text-sm whitespace-nowrap">
              Cut items only
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Course</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Baseline Vol.</TableHead>
                    <TableHead className="text-right">Scenario Vol.</TableHead>
                    <TableHead className="text-right">Δ Volume</TableHead>
                    <TableHead className="text-right">Baseline Cost</TableHead>
                    <TableHead className="text-right">Scenario Cost</TableHead>
                    <TableHead className="text-right">Δ Cost</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const volumeDeltaPercent = item.baseline_volume > 0
                      ? ((item.volume_delta) / item.baseline_volume) * 100
                      : 0;
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className={item.is_cut ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.is_protected && (
                              <Shield className="h-4 w-4 text-blue-500" />
                            )}
                            {item.is_abroad && (
                              <Plane className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{item.course_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.category_name} • {item.entity_name || 'All entities'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[item.priority_band || 'low']}>
                            {item.priority_band || 'N/A'}
                          </Badge>
                          {item.is_locally_adjusted && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              Adjusted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.baseline_volume}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.scenario_volume}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono ${
                            item.volume_delta < 0 ? 'text-red-500' : 
                            item.volume_delta > 0 ? 'text-green-500' : ''
                          }`}>
                            {item.volume_delta !== 0 && (
                              <span className="flex items-center justify-end gap-1">
                                {item.volume_delta < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {formatDelta(item.volume_delta)}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.baseline_cost)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.scenario_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono ${
                            item.cost_delta < 0 ? 'text-red-500' : 
                            item.cost_delta > 0 ? 'text-green-500' : ''
                          }`}>
                            {item.cost_delta !== 0 && formatCurrency(item.cost_delta)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isEditable && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setAdjustItem(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No items found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {adjustItem && (
        <LocalAdjustmentDialog
          open={!!adjustItem}
          onOpenChange={(open) => !open && setAdjustItem(null)}
          item={adjustItem}
          scenarioId={scenarioId}
        />
      )}
    </Card>
  );
}

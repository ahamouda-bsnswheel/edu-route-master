import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Grid3X3 } from 'lucide-react';
import { useHeatmapData } from '@/hooks/useAIPriority';

interface PriorityHeatmapProps {
  periodId?: string;
  planId?: string;
}

function getHeatmapColor(avgScore: number): string {
  if (avgScore >= 80) return 'bg-red-600';
  if (avgScore >= 60) return 'bg-orange-500';
  if (avgScore >= 40) return 'bg-yellow-500';
  if (avgScore >= 20) return 'bg-green-400';
  return 'bg-green-200';
}

function getTextColor(avgScore: number): string {
  if (avgScore >= 60) return 'text-white';
  return 'text-foreground';
}

export function PriorityHeatmap({ periodId, planId }: PriorityHeatmapProps) {
  const [rowDimension, setRowDimension] = useState<'entity' | 'department'>('entity');
  const [colDimension, setColDimension] = useState<'category' | 'training_type'>('category');
  
  const { data: heatmapData, isLoading } = useHeatmapData(rowDimension, colDimension);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  const rows = heatmapData?.rows || [];
  const columns = heatmapData?.columns || [];
  const matrix = heatmapData?.matrix || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Priority Heatmap
            </CardTitle>
            <CardDescription>
              Average priority scores visualized across dimensions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={rowDimension} onValueChange={(v) => setRowDimension(v as any)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entity">Rows: Entity</SelectItem>
                <SelectItem value="department">Rows: Dept</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">×</span>
            <Select value={colDimension} onValueChange={(v) => setColDimension(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Cols: Category</SelectItem>
                <SelectItem value="training_type">Cols: Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 || columns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for heatmap</p>
            <p className="text-sm mt-2">Run AI prioritisation to generate scores</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium border-b">
                    {rowDimension === 'entity' ? 'Entity' : 'Department'}
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="p-2 text-center text-sm font-medium border-b min-w-[80px]">
                      <div className="truncate max-w-[100px]" title={col}>
                        {col}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center text-sm font-medium border-b bg-muted">Avg</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowScores = columns.map(col => matrix[row]?.[col]?.avgScore || 0);
                  const rowAvg = rowScores.length > 0 
                    ? Math.round(rowScores.reduce((a, b) => a + b, 0) / rowScores.length)
                    : 0;
                  
                  return (
                    <tr key={row}>
                      <td className="p-2 text-sm font-medium border-b">
                        <div className="truncate max-w-[150px]" title={row}>
                          {row}
                        </div>
                      </td>
                      {columns.map((col) => {
                        const cell = matrix[row]?.[col];
                        const avgScore = cell?.avgScore || 0;
                        const count = cell?.count || 0;
                        
                        return (
                          <TooltipProvider key={col}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <td 
                                  className={`p-2 text-center text-sm border-b cursor-pointer transition-opacity hover:opacity-80 ${getHeatmapColor(avgScore)} ${getTextColor(avgScore)}`}
                                >
                                  {count > 0 ? Math.round(avgScore) : '-'}
                                </td>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-medium">{row} × {col}</p>
                                  <p>Avg Score: {avgScore.toFixed(1)}</p>
                                  <p>Items: {count}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                      <td className={`p-2 text-center text-sm font-medium border-b ${getHeatmapColor(rowAvg)} ${getTextColor(rowAvg)}`}>
                        {rowAvg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <span className="text-muted-foreground">Priority:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-200 rounded" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-600 rounded" />
                <span>Critical</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Bell, CheckCheck, FileText, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, React.ReactNode> = {
  approval_required: <Clock className="h-4 w-4 text-warning" />,
  request_approved: <CheckCircle className="h-4 w-4 text-success" />,
  request_rejected: <XCircle className="h-4 w-4 text-destructive" />,
  session_scheduled: <Calendar className="h-4 w-4 text-info" />,
  enrollment_confirmed: <CheckCircle className="h-4 w-4 text-success" />,
  enrollment_waitlisted: <Clock className="h-4 w-4 text-warning" />,
  session_cancelled: <XCircle className="h-4 w-4 text-destructive" />,
  reminder: <Bell className="h-4 w-4 text-warning" />,
  certificate_issued: <FileText className="h-4 w-4 text-success" />,
};

function NotificationItem({ 
  notification, 
  onRead,
  onNavigate,
}: { 
  notification: Notification;
  onRead: () => void;
  onNavigate: () => void;
}) {
  const handleClick = () => {
    if (!notification.is_read) {
      onRead();
    }
    onNavigate();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">
          {typeIcons[notification.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </button>
  );
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const getNavigationPath = (notification: Notification): string => {
    switch (notification.reference_type) {
      case 'training_request':
        return '/my-requests';
      case 'session':
        return `/sessions/${notification.reference_id}`;
      case 'approval':
        return '/approvals';
      case 'scholarship_application':
        return '/my-scholarship-applications';
      case 'service_bond':
        return '/my-bond';
      case 'scholar_record':
        return '/my-scholar-progress';
      case 'certificate':
        return '/my-certificates';
      default:
        return '/dashboard';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs h-auto py-1"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onNavigate={() => navigate(getNavigationPath(notification))}
              />
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

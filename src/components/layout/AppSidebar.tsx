import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Building2,
  GraduationCap,
  Shield,
} from 'lucide-react';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: [] },
  { title: 'Course Catalog', url: '/courses', icon: BookOpen, roles: [] },
  { title: 'My Requests', url: '/my-requests', icon: FileText, roles: [] },
  { title: 'Learning History', url: '/learning-history', icon: GraduationCap, roles: [] },
  { title: 'Training Calendar', url: '/calendar', icon: Calendar, roles: [] },
];

const managerNavItems = [
  { title: 'Team Requests', url: '/team-requests', icon: Users, roles: ['manager', 'hrbp', 'l_and_d', 'chro', 'admin'] },
  { title: 'Team Learning', url: '/team-learning', icon: GraduationCap, roles: ['manager', 'hrbp', 'l_and_d', 'chro', 'admin'] },
  { title: 'Approvals', url: '/approvals', icon: CheckSquare, roles: ['manager', 'hrbp', 'l_and_d', 'chro', 'admin'] },
];

const adminNavItems = [
  { title: 'Sessions', url: '/sessions', icon: GraduationCap, roles: ['l_and_d', 'chro', 'admin'] },
  { title: 'Compliance', url: '/compliance', icon: Shield, roles: ['l_and_d', 'hrbp', 'chro', 'admin'] },
  { title: 'Reports', url: '/reports', icon: BarChart3, roles: ['hrbp', 'l_and_d', 'chro', 'admin'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { roles, hasRole } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const canAccess = (allowedRoles: string[]) => {
    if (allowedRoles.length === 0) return true;
    return allowedRoles.some(role => hasRole(role as any));
  };

  const filteredManagerItems = managerNavItems.filter(item => canAccess(item.roles));
  const filteredAdminItems = adminNavItems.filter(item => canAccess(item.roles));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sidebar-foreground truncate">NOC Training</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">Learning Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manager Navigation */}
        {filteredManagerItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Navigation */}
        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50 text-center">
            © 2024 National Oil Corporation
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

'use client';

import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { UserPreferencesDialog } from './UserPreferencesDialog';
import Link from 'next/link';
import { isUserAdminClient } from '@/lib/auth/is-admin-client';

export function UserProfile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  if (!user) return null;

  // Check if user is admin using centralized function
  const isAdmin = isUserAdminClient(user);

  // Debug logging for admin check
  if (typeof window !== 'undefined') {
    console.log('User email:', user.emailAddresses?.[0]?.emailAddress);
    console.log('User ID:', user.id);
    console.log('Public metadata:', user.publicMetadata);
    console.log('Is admin?', isAdmin);
  }

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.firstName
    ? user.firstName.slice(0, 2).toUpperCase()
    : user.emailAddresses?.[0]?.emailAddress?.slice(0, 2).toUpperCase() || 'U';

  const displayName = user.fullName || user.firstName || user.emailAddresses?.[0]?.emailAddress || 'User';
  const email = user.emailAddresses?.[0]?.emailAddress || '';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 sm:h-10 px-1 sm:px-2 hover:bg-accent">
            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
              <AvatarImage src={user.imageUrl} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="ml-2 hidden md:inline-block text-sm">{displayName}</span>
            <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Shield className="mr-2 h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-600">Admin Panel</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Preferences</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://accounts.clerk.com/user`} target="_blank" rel="noopener noreferrer">
              <User className="mr-2 h-4 w-4" />
              <span>Manage Account</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserPreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </>
  );
}
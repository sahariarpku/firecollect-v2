import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import UserProfile from './UserProfile';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header = ({ user, onLogout }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">FireCollect</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://github.com/sahariar-safin/firecollect-v1"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>
            {user && <UserProfile user={user} onLogout={onLogout} />}
          </nav>
        </div>
      </div>
    </header>
  );
};

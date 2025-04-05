import { BookOpen } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">FireCollect</span>
          </div>
          <nav className="hidden md:flex space-x-4">
            <a 
              href="https://github.com/sahariarpku/firecollect-4" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

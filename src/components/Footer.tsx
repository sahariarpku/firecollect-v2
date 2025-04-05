import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} FireCollect. All rights reserved.</p>
          <p>Built with ❤️ for researchers</p>
        </div>
      </div>
    </footer>
  );
}

# FireCollect - Image Collection and Analysis Tool

FireCollect is a modern web application built with React, TypeScript, and Supabase for collecting, analyzing, and managing images. It features a beautiful UI built with shadcn/ui components and provides powerful image processing capabilities.

## 🚀 Features

- 🔐 Secure authentication with Supabase
- 📸 Image upload and management
- 🎨 Modern UI with shadcn/ui components
- 📱 Responsive design
- 🔍 Image analysis capabilities
- 📊 Data visualization with Recharts
- 📄 PDF processing support
- 🎯 Drag and drop file uploads
- 🌙 Dark mode support

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication:** Supabase
- **State Management:** React Query
- **Form Handling:** React Hook Form
- **Data Visualization:** Recharts
- **PDF Processing:** PDF.js
- **File Upload:** React Dropzone
- **Markdown Support:** React Markdown
- **Date Handling:** date-fns
- **Excel Processing:** xlsx

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Git
- Supabase CLI (for local development)

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sahariarpku/firecollect-v2.git
   cd firecollect-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   VITE_SUPABASE_DB_PASSWORD=your_database_password
   VITE_SUPABASE_PROJECT_ID=your_project_id

   # API Configuration
   VITE_FIRECRAWL_API_URL=your_firecrawl_api_url
   ```

## 🔐 Supabase Setup Guide

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - Name: `firecollect-v2`
   - Database Password: (save this for later)
   - Region: Choose the closest to your users
   - Pricing Plan: Free tier is sufficient for development

### 2. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable Email authentication
3. Configure Email Templates (optional but recommended)
4. Set up OAuth providers if needed (Google, GitHub, etc.)

### 3. Database Setup

1. Install Supabase CLI:
   ```bash
   npm install supabase --save-dev
   ```

2. Initialize Supabase in your project:
   ```bash
   npx supabase init
   ```

3. Link your project:
   ```bash
   npx supabase link --project-ref your_project_id
   ```
   You can find your project ID in the Supabase dashboard under Project Settings > General

4. Push the database schema:
   ```bash
   npx supabase db push
   ```

### 4. Storage Setup

1. In Supabase dashboard, go to Storage
2. Create a new bucket named `images`
3. Set the following bucket policies:
   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'images');

   -- Allow public access to view files
   CREATE POLICY "Allow public access"
   ON storage.objects FOR SELECT TO public
   USING (bucket_id = 'images');
   ```

### 5. Row Level Security (RLS)

The project includes RLS policies for data security. To enable them:

1. In Supabase dashboard, go to Authentication > Policies
2. Enable RLS on all tables
3. Apply the following policies:

```sql
-- Example RLS policy for images table
CREATE POLICY "Users can view their own images"
ON public.images
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
ON public.images
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 6. Database Functions

The project includes several database functions for image processing. To set them up:

1. In Supabase dashboard, go to SQL Editor
2. Run the SQL from `supabase/functions/` directory
3. Test the functions using the SQL Editor

### 7. Environment Variables

After setting up Supabase, update your `.env` file with the following values from your Supabase dashboard:

1. Go to Project Settings > API
2. Copy the following values:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
   - service_role key → `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - Project ID → `VITE_SUPABASE_PROJECT_ID`
   - Database Password → `VITE_SUPABASE_DB_PASSWORD`

## 🚀 Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

To preview the production build:

```bash
npm run preview
# or
yarn preview
```

## 📁 Project Structure

```
firecollect-v2/
├── src/
│   ├── components/     # React components
│   ├── integrations/  # Third-party integrations
│   ├── lib/          # Utility functions and configurations
│   ├── pages/        # Page components
│   └── App.tsx       # Main application component
├── supabase/
│   ├── migrations/   # Database migrations
│   ├── functions/    # Database functions
│   └── config.toml   # Supabase configuration
├── public/           # Static assets
├── .env             # Environment variables
├── package.json     # Project dependencies
└── vite.config.ts   # Vite configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Vite](https://vitejs.dev/) for the build tool
- [Tailwind CSS](https://tailwindcss.com/) for the styling system

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

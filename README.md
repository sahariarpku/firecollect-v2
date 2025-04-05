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

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sahariarpku/firecollect-v1.git
   cd firecollect-v1
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

   Replace the placeholder values with your actual Supabase credentials.

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
firecollect-v1/
├── src/
│   ├── components/     # React components
│   ├── integrations/  # Third-party integrations
│   ├── lib/          # Utility functions and configurations
│   ├── pages/        # Page components
│   └── App.tsx       # Main application component
├── public/           # Static assets
├── .env             # Environment variables
├── package.json     # Project dependencies
└── vite.config.ts   # Vite configuration
```

## 🔐 Authentication

The application uses Supabase for authentication. To set up authentication:

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Enable Email authentication in your Supabase project
3. Copy your project URL and anon key to the `.env` file
4. Create a user through the sign-up form or directly in the Supabase dashboard

## 📊 Database Setup

To push the database schema to Supabase:

1. Install Supabase CLI:
   ```bash
   npm install supabase --save-dev
   ```

2. Initialize Supabase (creates necessary configuration files):
   ```bash
   npx supabase init
   ```

3. Link your project:
   ```bash
   npx supabase link --project-ref your_project_id
   ```
   Replace `your_project_id` with the ID from your Supabase project settings.

4. Push the database schema:
   ```bash
   npx supabase db push
   ```

### Troubleshooting Database Setup

If you encounter issues:

1. **Wrong Database Connection**
   - Double-check your database password in `.env`
   - Ensure your project is active in the Supabase dashboard
   - Try resetting your database password in Supabase dashboard

2. **Project Linking Issues**
   - Verify your project ID is correct
   - Make sure you're logged in to Supabase CLI (`npx supabase login`)
   - Check if your project is active in the dashboard

3. **Migration Errors**
   - Clear local Supabase configuration:
     ```bash
     rm -rf .supabase
     npx supabase init
     ```
   - Relink and push:
     ```bash
     npx supabase link --project-ref your_project_id
     npx supabase db push
     ```

4. **Permission Issues**
   - Verify your service role key has the correct permissions
   - Check if your project's database is not paused
   - Ensure RLS (Row Level Security) policies are properly configured

### Database Schema

The project includes several key tables:

- `users`: User profiles and authentication data
- `images`: Image metadata and storage references
- `analysis_results`: Results from image analysis
- `user_settings`: User preferences and configurations

All tables include proper foreign key relationships and RLS policies for security.

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

import NotebookList from '../components/NotebookList';

export default function Home() {
  return (
    <div className="min-h-screen w-screen max-w-none m-0 p-0 bg-gray-900">
      <header className="w-full border-b border-gray-800">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-medium tracking-tight text-gray-100">
            <span>JASON</span>
            <span className="text-teal-400">data</span>
            <span className="ml-4">|<span className="ml-4">Home</span></span>
          </h1>
        </div>
      </header>
      <main className="bg-gray-900">
        <NotebookList />
      </main>
    </div>
  );
} 
export default function Loading() {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <span className="text-gray-400 font-mono">Searching...</span>
        </div>
      </div>
    )
  }
  
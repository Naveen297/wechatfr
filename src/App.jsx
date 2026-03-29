import React, { useState, useEffect } from 'react';
import { Heart, Video, Globe, Copy, Check } from 'lucide-react';
import VideoChat from './components/VideoChat';
import Chat from './components/Chat';

function App() {
  const [isEnglish, setIsEnglish] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check URL for room parameter
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId);
      setIsInRoom(true);
    }
  }, []);

  const createRoom = () => {
    const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setRoomId(newRoomId);
    setIsInRoom(true);
    // Update URL
    window.history.pushState({}, '', `?room=${newRoomId}`);
  };

  const joinRoom = () => {
    if (joinRoomInput.trim()) {
      setRoomId(joinRoomInput.trim());
      setIsInRoom(true);
      // Update URL
      window.history.pushState({}, '', `?room=${joinRoomInput.trim()}`);
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConnectionChange = (connected) => {
    setIsConnected(connected);
  };

  // Landing Page / Home Screen
  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-8 h-8 text-pink-500" fill="currentColor" />
              <h1 className="text-4xl font-bold gradient-text">LoveConnect</h1>
              <Heart className="w-8 h-8 text-pink-500" fill="currentColor" />
            </div>
            <p className="text-gray-600 text-sm">
              {isEnglish
                ? 'Video chat with real-time translation for you and your loved one'
                : 'Відеочат із перекладом у реальному часі для вас і ваших близьких'}
            </p>
          </div>

          {/* Language Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-600">
            <Globe className="w-4 h-4" />
            <span>English ❤ Ukrainian</span>
          </div>

          {/* Language Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {isEnglish ? 'Select Your Language' : 'Виберіть свою мову'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsEnglish(true)}
                className={`py-3 px-4 rounded-lg font-semibold transition-premium hover-lift ${
                  isEnglish
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => setIsEnglish(false)}
                className={`py-3 px-4 rounded-lg font-semibold transition-premium hover-lift ${
                  !isEnglish
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇺🇦 Українська
              </button>
            </div>
          </div>

          {/* Create Room Button */}
          <button
            onClick={createRoom}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-premium hover-lift flex items-center justify-center gap-3 mb-6"
          >
            <Video className="w-5 h-5" />
            {isEnglish ? 'Create New Room' : 'Створити нову кімнату'}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {isEnglish ? 'or join existing room' : 'або приєднатися до існуючої кімнати'}
              </span>
            </div>
          </div>

          {/* Join Room */}
          <div className="mb-6">
            <input
              type="text"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value)}
              placeholder={isEnglish ? 'Enter room ID' : 'Введіть ID кімнати'}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none mb-3 transition-premium"
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            />
            <button
              onClick={joinRoom}
              disabled={!joinRoomInput.trim()}
              className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-premium hover-lift"
            >
              {isEnglish ? 'Join Room' : 'Приєднатися до кімнати'}
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-pink-900 mb-2">
              {isEnglish ? 'How it works:' : 'Як це працює:'}
            </p>
            <ol className="text-pink-800 space-y-1 list-decimal list-inside">
              <li>
                {isEnglish
                  ? 'Create a new room or join an existing one'
                  : 'Створіть нову кімнату або приєднайтеся до існуючої'}
              </li>
              <li>
                {isEnglish
                  ? 'Share the room link with your partner'
                  : 'Поділіться посиланням на кімнату зі своїм партнером'}
              </li>
              <li>
                {isEnglish
                  ? 'Chat with automatic translation between languages'
                  : 'Спілкуйтеся з автоматичним перекладом між мовами'}
              </li>
            </ol>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            {isEnglish ? 'Made with love 💕' : "Зроблено з любов'ю 💕"}
          </div>
        </div>
      </div>
    );
  }

  // Video Chat Room
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-lg px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-pink-500" fill="currentColor" />
          <h1 className="text-xl font-bold gradient-text">LoveConnect</h1>
          <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse-slow"></div>
                <span className="text-xs font-semibold text-green-700">
                  {isEnglish ? 'Connected' : 'Підключено'}
                </span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                <span className="text-xs font-semibold text-gray-500">
                  {isEnglish ? 'Waiting...' : 'Очікування...'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">
            <span className="font-semibold">{isEnglish ? 'Room:' : 'Кімната:'}</span>{' '}
            <span className="font-mono">
              {roomId.length > 15 ? `${roomId.substring(0, 15)}...` : roomId}
            </span>
          </div>
          <button
            onClick={copyRoomLink}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:shadow-lg transition-premium hover-lift flex items-center gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                {isEnglish ? 'Copied!' : 'Скопійовано!'}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {isEnglish ? 'Copy' : 'Копія'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex flex-col md:flex-row gap-2 flex-1 p-2 overflow-hidden">
        {/* Video Section - Full width on mobile, 70% on desktop */}
        <div className="w-full md:w-[70%] h-[60%] md:h-full rounded-xl overflow-hidden shadow-2xl order-1 md:order-2">
          <VideoChat
            roomId={roomId}
            isEnglish={isEnglish}
            onConnectionChange={handleConnectionChange}
          />
        </div>

        {/* Chat Section - Bottom on mobile, left side (30%) on desktop */}
        <div className="w-full md:w-[30%] h-[40%] md:h-full overflow-hidden order-2 md:order-1">
          <Chat roomId={roomId} isEnglish={isEnglish} isConnected={isConnected} />
        </div>
      </div>
    </div>
  );
}

export default App;


//hello world
// import React from 'react';

// function App() {
//   return (
//     <div>
//       <h1>Hello World</h1>
//     </div>
//   );
// }

// export default App;
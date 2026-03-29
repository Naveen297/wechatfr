import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { BACKEND_URL } from '../config';
import { translateEnglishToUkrainian, translateUkrainianToEnglish } from '../utils/translator';

const Chat = ({ roomId, isEnglish, isConnected }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    socketRef.current = io(BACKEND_URL);

    // Listen for incoming messages
    socketRef.current.on('receive-message', async ({ message, sender, timestamp }) => {
      console.log('Received message:', { message, sender, timestamp });

      // Translate received message to user's language
      let translatedMessage = message;
      try {
        if (isEnglish) {
          // User is English, message is in Ukrainian, translate to English
          translatedMessage = await translateUkrainianToEnglish(message);
        } else {
          // User is Ukrainian, message is in English, translate to Ukrainian
          translatedMessage = await translateEnglishToUkrainian(message);
        }
      } catch (error) {
        console.error('Translation error:', error);
        translatedMessage = message;
      }

      setMessages((prev) => [
        ...prev,
        {
          text: translatedMessage,
          original: message,
          sender: 'them',
          timestamp: timestamp || new Date().toISOString(),
        },
      ]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, isEnglish]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || !isConnected || isTranslating) return;

    setIsTranslating(true);

    try {
      // Translate message to partner's language before sending
      let translatedMessage = inputMessage;
      if (isEnglish) {
        // User is English, translate to Ukrainian
        translatedMessage = await translateEnglishToUkrainian(inputMessage);
      } else {
        // User is Ukrainian, translate to English
        translatedMessage = await translateUkrainianToEnglish(inputMessage);
      }

      const timestamp = new Date().toISOString();

      // Add to local messages (show original for user)
      setMessages((prev) => [
        ...prev,
        {
          text: inputMessage,
          translated: translatedMessage,
          sender: 'me',
          timestamp,
        },
      ]);

      // Send translated message via socket
      socketRef.current.emit('send-message', {
        roomId,
        message: translatedMessage,
        sender: 'me',
        timestamp,
      });

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-pink-500/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-white font-semibold text-lg">
              {isEnglish ? 'Messages' : 'Повідомлення'}
            </h3>
            {!isConnected && (
              <p className="text-pink-100 text-xs">
                {isEnglish ? 'Waiting for connection...' : 'Очікування підключення...'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-16 h-16 text-gray-600 mb-3 opacity-50" />
            <p className="text-gray-400 text-sm">
              {isEnglish ? 'No messages yet. Start chatting!' : 'Немає повідомлень. Почніть спілкуватися!'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[90%] rounded-xl p-3 ${
                    msg.sender === 'me'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-700/80 backdrop-blur text-white shadow-md'
                  }`}
                >
                  <p className="text-sm break-words leading-relaxed">{msg.text}</p>

                  {/* Show translated text for sent messages */}
                  {msg.sender === 'me' && msg.translated && (
                    <p className="text-xs mt-2 text-pink-100 border-t border-pink-400/30 pt-2 italic">
                      🇺🇦 {msg.translated}
                    </p>
                  )}

                  {/* Show original text for received messages */}
                  {msg.sender === 'them' && msg.original && (
                    <p className="text-xs mt-2 text-gray-300 border-t border-gray-500/30 pt-2 italic">
                      🇺🇦 {msg.original}
                    </p>
                  )}

                  <p
                    className={`text-xs mt-1.5 ${
                      msg.sender === 'me' ? 'text-pink-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t-2 border-gray-700 bg-gray-800/50 backdrop-blur p-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isEnglish ? 'Type your message...' : 'Введіть повідомлення...'}
            disabled={!isConnected || isTranslating}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-white placeholder-gray-400 border-2 border-gray-600 rounded-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected || isTranslating}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            {isTranslating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">{isEnglish ? 'Send' : 'Надіслати'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: 'client' | 'contractor';
  sender_name: string;
  created_at: string;
  is_read: boolean;
}

interface ClientMessagingProps {
  contractorName?: string;
  contractorEmail?: string;
  contractorPhone?: string;
}

export default function ClientMessaging({ 
  contractorName = "John Smith", 
  contractorEmail = "john@dyluxepro.com",
  contractorPhone = "(555) 123-4567"
}: ClientMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load sample messages for prototype
    setMessages([
      {
        id: "1",
        content: "Hi! I'm excited to work on your project. When would be a good time to start?",
        sender: 'contractor',
        sender_name: contractorName,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_read: true
      },
      {
        id: "2",
        content: "Hello! I'd like to start next Monday if that works for you. The weather looks good.",
        sender: 'client',
        sender_name: 'You',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        is_read: true
      },
      {
        id: "3",
        content: "Perfect! I'll be there Monday at 9 AM. I'll bring my team and all the equipment we need.",
        sender: 'contractor',
        sender_name: contractorName,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        is_read: true
      },
      {
        id: "4",
        content: "Great! I'll make sure the gate is unlocked. Looking forward to seeing the results!",
        sender: 'client',
        sender_name: 'You',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        is_read: true
      }
    ]);
  }, [contractorName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    
    // Simulate sending message
    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'client',
      sender_name: 'You',
      created_at: new Date().toISOString(),
      is_read: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  return (
    <Card className="h-full border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-600 text-white">
                {contractorName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{contractorName}</CardTitle>
              <p className="text-sm text-gray-600">Your Contractor</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-96">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'client' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.content}</p>
                <div className={`flex items-center mt-1 text-xs ${
                  message.sender === 'client' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(message.created_at)}
                  {message.sender === 'client' && (
                    <div className="ml-2">
                      {message.is_read ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button 
              type="submit" 
              disabled={loading || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}


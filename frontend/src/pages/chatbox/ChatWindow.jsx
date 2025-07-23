import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";
import { useSocket } from "../../context/SocketContext";

const ChatWindow = () => {
  const { otherUserId } = useParams();
  const userId = parseInt(localStorage.getItem("userId"));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const socket = useSocket();
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  // Fetch conversation & setup socket listeners
  useEffect(() => {
    let isMounted = true; // To prevent state updates if component unmounts during fetch

    const fetchConversation = async () => {
      try {
        const res = await axios.get(`/messages/conversation/${otherUserId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (isMounted) setMessages(res.data);
      } catch (err) {
        console.error("Conversation fetch error", err);
      }
    };

    fetchConversation();

    // Mark as read
    axios.patch(`/messages/conversation/${otherUserId}/read`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).catch(console.error);

    const handleReceive = (msg) => {
      if (msg.sender_id === parseInt(otherUserId)) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === parseInt(otherUserId)) {
        setIsTyping(true);

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };

    if (socket) {
      socket.on("receiveMessage", handleReceive);
      socket.on("userTyping", handleTyping);
    }

    return () => {
      isMounted = false;

      if (socket) {
        socket.off("receiveMessage", handleReceive);
        socket.off("userTyping", handleTyping);
      }

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [otherUserId, socket]);

  // Scroll to bottom on new messages or typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      await axios.post(
        "/messages",
        { receiverId: otherUserId, message: input },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setMessages((prev) => [
        ...prev,
        { sender_id: userId, receiver_id: parseInt(otherUserId), message: input, created_at: new Date() },
      ]);

      setInput("");
    } catch (err) {
      console.error("Send message error", err);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (socket) {
      socket.emit("typing", {
        senderId: userId,
        receiverId: parseInt(otherUserId),
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2 my-1 ${m.sender_id === userId ? "text-right" : "text-left"}`}
          >
            <span className="inline-block bg-gray-200 p-2 rounded">{m.message}</span>
            <span className="text-xs text-gray-500 block mt-1">
              {new Date(m.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="text-left text-sm text-gray-500 px-2 italic">Typing...</div>
        )}

        <div ref={bottomRef}></div>
      </div>

      <div className="flex border-t p-2">
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded mr-2"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;

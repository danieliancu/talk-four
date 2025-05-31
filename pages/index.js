// pages/index.js
import ChatBox from "../components/ChatBox";
import chatConfig from "../config/chatConfig";

export default function Home() {
  return (
    <div>
      {/* The title inside ChatBox uses chatConfig.ui.appTitle */}
      <ChatBox />
    </div>
  );
}

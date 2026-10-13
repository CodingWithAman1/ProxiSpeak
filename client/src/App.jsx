import JoinScreen from './components/JoinScreen.jsx';
import WorldCanvas from './components/WorldCanvas.jsx';
import { useSocket } from './hooks/useSocket.js';
import { drawWorld } from './canvas/renderer.js';

export default function App() {
  const { world, status, error, joinedInfo, join } = useSocket();

  // Until the server confirms `joined`, stay on the join screen so its
  // validation and server errors (room_not_found, invalid payload,
  // connection failure) are what the user sees.
  if (!joinedInfo) {
    return <JoinScreen onJoin={join} status={status} error={error} />;
  }

  return (
    <>
      <WorldCanvas world={world} renderFrame={drawWorld} />
      <div className="world-hud">
        {joinedInfo.roomName} · joined as {joinedInfo.name}
        {status === 'disconnected' ? ' · disconnected (reload to rejoin)' : ''}
        {' · Movement arrives on Day 5'}
      </div>
    </>
  );
}

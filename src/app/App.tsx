import TaskApp from './components/TaskApp';

export default function App() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-black">
      <div className="w-[390px] h-[844px] shadow-2xl rounded-3xl overflow-hidden">
        <TaskApp />
      </div>
    </div>
  );
}
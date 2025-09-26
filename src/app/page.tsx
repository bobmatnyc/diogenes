import { redirect } from 'next/navigation';

export default function Home() {
  // Immediately redirect to the chat page
  // The chat page handles authentication and shows the appropriate UI
  redirect('/chat');
}
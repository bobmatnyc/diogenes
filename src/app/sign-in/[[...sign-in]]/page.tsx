import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to Diogenes
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            The Digital Cynic awaits your questions
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-lg',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200',
              formButtonPrimary:
                'w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              footerActionLink: 'text-indigo-600 hover:text-indigo-500',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/chat"
        />

        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to engage in philosophical debate
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            "The only true wisdom is in knowing you know nothing" - Socrates
          </p>
        </div>
      </div>
    </div>
  );
}

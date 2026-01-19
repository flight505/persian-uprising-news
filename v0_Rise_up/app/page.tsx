import SplashScreen from "./components/SplashScreen/SplashScreen"
import HomePage from "./components/HomePage/HomePage"

export default function Home() {
  return (
    <>
      <SplashScreen />
      <main className="min-h-screen bg-background">
        <HomePage />
      </main>
    </>
  )
}

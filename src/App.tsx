import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DeviceProvider } from "./contexts/DeviceContext";
import { GoogleAuthProvider } from "./components/GoogleAuthProvider";
import PWAInstallPrompt, { IOSInstallInstructions } from "./components/PWAInstallPrompt";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Contracts from "./pages/Contracts";
import MyDevices from "./pages/MyDevices";
import AddDevice from "./pages/AddDevice";
import Shop from "./pages/Shop";
import ElevenLabsChat from "./pages/ElevenLabsChat";
import EnvironmentTest from "./pages/EnvironmentTest";
import Chat from "./pages/Chat";
import DeviceSend from "./pages/DeviceSend";
import Gallery from "./pages/Gallery";
import Creation from "./pages/Creation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SidebarProvider>
        <GoogleAuthProvider
          clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
          onAuthReady={() => console.log('Google Auth ready')}
          onAuthError={(error) => console.error('Google Auth error:', error)}
        >
          <DeviceProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/my-devices" element={<MyDevices />} />
                <Route path="/add-device" element={<AddDevice />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/elevenlabs-chat" element={<ElevenLabsChat />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/device-send" element={<DeviceSend />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/creation" element={<Creation />} />
                <Route path="/env-test" element={<EnvironmentTest />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* PWA Install Prompts */}
              <PWAInstallPrompt />
              <IOSInstallInstructions />
            </BrowserRouter>
          </DeviceProvider>
        </GoogleAuthProvider>
      </SidebarProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

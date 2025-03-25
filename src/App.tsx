
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import TimetableWizard from "./pages/timetable/TimetableWizard";
import ClassSelection from "./pages/timetable/ClassSelection";
import SubjectsConfig from "./pages/timetable/SubjectsConfig";
import TeacherAvailability from "./pages/timetable/TeacherAvailability";
import SchoolTimings from "./pages/timetable/SchoolTimings";
import TimetableGenerator from "./pages/timetable/TimetableGenerator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Timetable Wizard Routes */}
          <Route path="/timetable-wizard" element={<TimetableWizard />} />
          <Route path="/timetable-wizard/class-selection" element={<ClassSelection />} />
          <Route path="/timetable-wizard/subjects" element={<SubjectsConfig />} />
          <Route path="/timetable-wizard/teachers" element={<TeacherAvailability />} />
          <Route path="/timetable-wizard/school-timings" element={<SchoolTimings />} />
          <Route path="/timetable-wizard/generator" element={<TimetableGenerator />} />
          
          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

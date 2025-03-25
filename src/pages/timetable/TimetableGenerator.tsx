
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ArrowLeft, Download, Plus, Printer, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = {
  id: string;
  name: string;
  type: 'Main' | 'Secondary' | 'Elective';
  classesPerWeek: number;
  daysPerWeek?: number;
};

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
  classesPerWeek: number;
  availability: {
    [key: string]: {
      morning: boolean;
      afternoon: boolean;
    };
  };
};

type Period = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'Regular' | 'Break' | 'Lunch';
};

type TimeSlot = {
  periodId: string;
  subject: string | null;
  teacher: string | null;
};

type DaySchedule = {
  [periodId: string]: TimeSlot;
};

type WeekSchedule = {
  [day: string]: DaySchedule;
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [timetable, setTimetable] = useState<WeekSchedule>({});
  const [isGenerated, setIsGenerated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  
  // Fetch saved data from session storage
  useEffect(() => {
    const storedClass = sessionStorage.getItem('selectedClass');
    const storedSection = sessionStorage.getItem('selectedSection');
    const storedSubjects = sessionStorage.getItem('subjects');
    const storedTeachers = sessionStorage.getItem('teachers');
    const storedPeriods = sessionStorage.getItem('periods');
    
    if (storedClass) setSelectedClass(storedClass);
    if (storedSection) setSelectedSection(storedSection);
    if (storedSubjects) setSubjects(JSON.parse(storedSubjects));
    if (storedTeachers) setTeachers(JSON.parse(storedTeachers));
    if (storedPeriods) setPeriods(JSON.parse(storedPeriods));
    
    // Initialize empty timetable
    initializeTimetable();
  }, []);
  
  // Re-initialize timetable when periods change
  useEffect(() => {
    if (periods.length > 0) {
      initializeTimetable();
    }
  }, [periods]);
  
  const initializeTimetable = () => {
    const newTimetable: WeekSchedule = {};
    
    weekDays.forEach(day => {
      newTimetable[day] = {};
      
      periods.forEach(period => {
        if (period.type === 'Regular') {
          newTimetable[day][period.id] = {
            periodId: period.id,
            subject: null,
            teacher: null,
          };
        }
      });
    });
    
    setTimetable(newTimetable);
  };
  
  const handleGenerateTimetable = () => {
    // Simple algorithm to generate timetable
    // In a real app, this would be much more sophisticated
    
    const newTimetable = { ...timetable };
    const regularPeriods = periods.filter(p => p.type === 'Regular');
    
    // Track subject and teacher usage for balance
    const subjectUsageCount: { [key: string]: number } = {};
    const teacherUsageCount: { [key: string]: number } = {};
    
    subjects.forEach(subject => {
      subjectUsageCount[subject.name] = 0;
    });
    
    teachers.forEach(teacher => {
      teacherUsageCount[teacher.name] = 0;
    });
    
    // First pass: Assign main subjects
    const mainSubjects = subjects.filter(s => s.type === 'Main');
    
    weekDays.forEach(day => {
      // Morning periods get main subjects
      const dayPeriods = Object.keys(newTimetable[day]);
      const morningPeriods = dayPeriods.slice(0, Math.ceil(dayPeriods.length / 2));
      
      morningPeriods.forEach((periodId, index) => {
        if (index < mainSubjects.length) {
          const subject = mainSubjects[index];
          
          // Find suitable teacher
          const eligibleTeachers = teachers.filter(t => 
            t.subjects.includes(subject.name) && 
            teacherUsageCount[t.name] < t.classesPerWeek
          );
          
          if (eligibleTeachers.length > 0) {
            // Choose teacher with least usage
            eligibleTeachers.sort((a, b) => teacherUsageCount[a.name] - teacherUsageCount[b.name]);
            const teacher = eligibleTeachers[0];
            
            newTimetable[day][periodId] = {
              periodId,
              subject: subject.name,
              teacher: teacher.name
            };
            
            // Update usage counts
            subjectUsageCount[subject.name]++;
            teacherUsageCount[teacher.name]++;
          }
        }
      });
    });
    
    // Second pass: Fill remaining slots
    weekDays.forEach(day => {
      Object.keys(newTimetable[day]).forEach(periodId => {
        if (!newTimetable[day][periodId].subject) {
          // Find subject with least usage relative to required classes
          const availableSubjects = subjects.filter(s => {
            const targetClasses = s.classesPerWeek;
            return subjectUsageCount[s.name] < targetClasses;
          });
          
          if (availableSubjects.length > 0) {
            // Sort by usage vs required ratio
            availableSubjects.sort((a, b) => {
              const ratioA = subjectUsageCount[a.name] / a.classesPerWeek;
              const ratioB = subjectUsageCount[b.name] / b.classesPerWeek;
              return ratioA - ratioB;
            });
            
            const subject = availableSubjects[0];
            
            // Find suitable teacher
            const eligibleTeachers = teachers.filter(t => 
              t.subjects.includes(subject.name) && 
              teacherUsageCount[t.name] < t.classesPerWeek
            );
            
            if (eligibleTeachers.length > 0) {
              // Choose teacher with least usage
              eligibleTeachers.sort((a, b) => teacherUsageCount[a.name] - teacherUsageCount[b.name]);
              const teacher = eligibleTeachers[0];
              
              newTimetable[day][periodId] = {
                periodId,
                subject: subject.name,
                teacher: teacher.name
              };
              
              // Update usage counts
              subjectUsageCount[subject.name]++;
              teacherUsageCount[teacher.name]++;
            }
          }
        }
      });
    });
    
    setTimetable(newTimetable);
    setIsGenerated(true);
    
    toast({
      title: "Timetable Generated",
      description: "Timetable has been generated successfully. You can now review and make adjustments.",
    });
  };
  
  const handleSlotClick = (day: string, periodId: string) => {
    setSelectedDay(day);
    setSelectedPeriod(periodId);
    
    // Pre-select current values if any
    const currentSlot = timetable[day][periodId];
    if (currentSlot.subject) {
      setSelectedSubject(currentSlot.subject);
    } else {
      setSelectedSubject('');
    }
    
    if (currentSlot.teacher) {
      setSelectedTeacher(currentSlot.teacher);
    } else {
      setSelectedTeacher('');
    }
    
    setDialogOpen(true);
  };
  
  const handleAssignSlot = () => {
    if (selectedDay && selectedPeriod) {
      const newTimetable = { ...timetable };
      
      newTimetable[selectedDay][selectedPeriod] = {
        periodId: selectedPeriod,
        subject: selectedSubject || null,
        teacher: selectedTeacher || null
      };
      
      setTimetable(newTimetable);
      setDialogOpen(false);
      
      toast({
        title: "Slot Updated",
        description: "The timetable slot has been updated successfully.",
      });
    }
  };
  
  const getEligibleTeachers = (subjectName: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectName));
  };
  
  const getRegularPeriods = () => {
    return periods.filter(period => period.type === 'Regular').sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };
  
  const getAllPeriods = () => {
    return periods.sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };
  
  const handlePrintTimetable = () => {
    if (!printRef.current) return;
    
    const originalContents = document.body.innerHTML;
    const printContents = printRef.current.innerHTML;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive",
      });
      return;
    }
    
    // Add necessary styles
    printWindow.document.write(`
      <html>
        <head>
          <title>Timetable - ${selectedClass} Section ${selectedSection}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            h1, h2 {
              text-align: center;
              margin-bottom: 10px;
            }
            .break-cell {
              background-color: #f9f9f9;
              font-style: italic;
              text-align: center;
            }
            .header-info {
              text-align: center;
              margin-bottom: 20px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>Class Timetable</h1>
            <h2>${selectedClass} - Section ${selectedSection}</h2>
          </div>
          ${printContents}
        </body>
      </html>
    `);
    
    // Trigger print and close window after printing
    printWindow.document.close();
    printWindow.focus();
    
    // Add slight delay to ensure styles are loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  
  return (
    <Layout 
      title="Timetable Generator" 
      subtitle="Step 5 of 5 - Create and review timetable"
    >
      <div className="w-full">
        <Card className="w-full mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {selectedClass ? `${selectedClass} - Section ${selectedSection}` : 'Loading...'}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/timetable-wizard/school-timings')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <Button 
                variant="default" 
                onClick={handleGenerateTimetable}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Timetable
              </Button>
              
              <Button 
                variant="outline" 
                disabled={!isGenerated}
                onClick={handlePrintTimetable}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <div ref={printRef}>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Time</TableHead>
                      {weekDays.map(day => (
                        <TableHead key={day}>{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAllPeriods().map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-mono text-sm">
                              {formatTime(period.startTime)} - {formatTime(period.endTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {period.name}
                            </div>
                          </div>
                        </TableCell>
                        
                        {weekDays.map((day) => {
                          if (period.type !== 'Regular') {
                            return (
                              <TableCell key={day} className="bg-muted/30 text-center">
                                <div className="text-muted-foreground font-medium">
                                  {period.type === 'Break' ? 'Short Break' : 'Lunch Break'}
                                </div>
                              </TableCell>
                            );
                          }
                          
                          const timeSlot = timetable[day]?.[period.id];
                          
                          return (
                            <TableCell 
                              key={day} 
                              className={`cursor-pointer hover:bg-muted/50 transition-colors ${!timeSlot?.subject ? 'bg-muted/20' : ''}`}
                              onClick={() => handleSlotClick(day, period.id)}
                            >
                              {timeSlot?.subject ? (
                                <div>
                                  <div className="font-medium">{timeSlot.subject}</div>
                                  {timeSlot.teacher && (
                                    <div className="text-xs text-muted-foreground">
                                      {timeSlot.teacher}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex justify-center items-center h-full">
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subject & Teacher</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="subject" className="text-right text-sm font-medium">
                Subject
              </label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="teacher" className="text-right text-sm font-medium">
                Teacher
              </label>
              <Select 
                value={selectedTeacher} 
                onValueChange={setSelectedTeacher}
                disabled={!selectedSubject}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubject && getEligibleTeachers(selectedSubject).map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.name}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignSlot}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Helper function to format time
function formatTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return timeString; // Return original if parsing fails
  }
}

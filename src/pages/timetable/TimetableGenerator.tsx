
import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Download, Plus, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = {
  id: string;
  name: string;
  type: 'Main' | 'Secondary' | 'Elective';
  classesPerWeek: number;
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
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [timetable, setTimetable] = useState<WeekSchedule>({});
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <Tabs defaultValue="Monday" value={selectedDay} onValueChange={setSelectedDay}>
          <TabsList className="w-full mb-6 grid grid-cols-6">
            {weekDays.map((day) => (
              <TabsTrigger key={day} value={day} className="text-center">
                {day}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {weekDays.map((day) => (
            <TabsContent key={day} value={day} className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Time</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAllPeriods().map((period) => {
                        const timeSlot = period.type === 'Regular' ? timetable[day]?.[period.id] : null;
                        
                        return (
                          <TableRow key={period.id}>
                            <TableCell>
                              <div className="font-mono text-sm">
                                {formatTime(period.startTime)} - {formatTime(period.endTime)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`font-medium ${period.type !== 'Regular' ? 'text-muted-foreground' : ''}`}>
                                {period.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {period.type}
                              </div>
                            </TableCell>
                            <TableCell>
                              {period.type === 'Regular' ? (
                                timeSlot?.subject ? (
                                  <div className="font-medium">{timeSlot.subject}</div>
                                ) : (
                                  <div className="text-muted-foreground">Not assigned</div>
                                )
                              ) : (
                                <div className="text-muted-foreground">
                                  {period.type === 'Break' ? 'Short Break' : 'Lunch Break'}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {period.type === 'Regular' ? (
                                timeSlot?.teacher ? (
                                  <div>{timeSlot.teacher}</div>
                                ) : (
                                  <div className="text-muted-foreground">Not assigned</div>
                                )
                              ) : (
                                <div className="text-muted-foreground">-</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {period.type === 'Regular' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleSlotClick(day, period.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
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


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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

type SubjectDistribution = {
  [subjectName: string]: {
    assigned: number;
    required: number;
    weight: number;
    daysSinceLastAssigned: {[day: string]: number};
  };
};

type TeacherAssignment = {
  [teacherName: string]: {
    assigned: number;
    maxLoad: number;
    dayLoad: {[day: string]: number};
    consecutiveClasses: {[day: string]: number};
  };
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
  
  // Track subject distribution and teacher assignments for optimized timetable generation
  const [subjectDistribution, setSubjectDistribution] = useState<SubjectDistribution>({});
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment>({});
  
  // Fetch saved data from session storage
  useEffect(() => {
    const storedClass = sessionStorage.getItem('selectedClass');
    const storedSection = sessionStorage.getItem('selectedSection');
    const storedSubjects = sessionStorage.getItem('subjects');
    const storedTeachers = sessionStorage.getItem('teachers');
    const storedPeriods = sessionStorage.getItem('periods');
    
    if (storedClass) setSelectedClass(storedClass);
    if (storedSection) setSelectedSection(storedSection);
    if (storedSubjects) {
      const parsedSubjects = JSON.parse(storedSubjects);
      setSubjects(parsedSubjects);
      initializeSubjectDistribution(parsedSubjects);
    }
    if (storedTeachers) {
      const parsedTeachers = JSON.parse(storedTeachers);
      setTeachers(parsedTeachers);
      initializeTeacherAssignments(parsedTeachers);
    }
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
  
  const initializeSubjectDistribution = (subjectsList: Subject[]) => {
    const distribution: SubjectDistribution = {};
    
    subjectsList.forEach(subject => {
      const daysSinceLastAssigned: {[key: string]: number} = {};
      weekDays.forEach(day => {
        daysSinceLastAssigned[day] = 0;
      });
      
      distribution[subject.name] = {
        assigned: 0,
        required: subject.classesPerWeek,
        weight: subject.type === 'Main' ? 3 : subject.type === 'Secondary' ? 2 : 1,
        daysSinceLastAssigned
      };
    });
    
    setSubjectDistribution(distribution);
  };
  
  const initializeTeacherAssignments = (teachersList: Teacher[]) => {
    const assignments: TeacherAssignment = {};
    
    teachersList.forEach(teacher => {
      const dayLoad: {[key: string]: number} = {};
      const consecutiveClasses: {[key: string]: number} = {};
      
      weekDays.forEach(day => {
        dayLoad[day] = 0;
        consecutiveClasses[day] = 0;
      });
      
      assignments[teacher.name] = {
        assigned: 0,
        maxLoad: teacher.classesPerWeek,
        dayLoad,
        consecutiveClasses
      };
    });
    
    setTeacherAssignments(assignments);
  };
  
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
  
  const updateSubjectDistribution = (subject: string, day: string, isAdding: boolean) => {
    setSubjectDistribution(prev => {
      const updated = {...prev};
      
      if (isAdding) {
        // Increment assigned count
        updated[subject].assigned += 1;
        
        // Reset days since last assigned for this day
        updated[subject].daysSinceLastAssigned[day] = 0;
        
        // Increment other days
        Object.keys(updated[subject].daysSinceLastAssigned).forEach(d => {
          if (d !== day) {
            updated[subject].daysSinceLastAssigned[d] += 1;
          }
        });
      } else {
        // Decrement assigned count
        updated[subject].assigned = Math.max(0, updated[subject].assigned - 1);
      }
      
      return updated;
    });
  };
  
  const updateTeacherAssignments = (teacher: string, day: string, periodIndex: number, isAdding: boolean) => {
    setTeacherAssignments(prev => {
      const updated = {...prev};
      
      if (isAdding) {
        // Increment assigned count
        updated[teacher].assigned += 1;
        
        // Increment day load
        updated[teacher].dayLoad[day] += 1;
        
        // Check for consecutive classes and update if needed
        updated[teacher].consecutiveClasses[day] = periodIndex;
      } else {
        // Decrement assigned count
        updated[teacher].assigned = Math.max(0, updated[teacher].assigned - 1);
        
        // Decrement day load
        updated[teacher].dayLoad[day] = Math.max(0, updated[teacher].dayLoad[day] - 1);
      }
      
      return updated;
    });
  };
  
  // Advanced timetable generation algorithm
  const handleGenerateTimetable = () => {
    const newTimetable = { ...timetable };
    const regularPeriods = periods.filter(p => p.type === 'Regular')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Reset tracking
    initializeSubjectDistribution(subjects);
    initializeTeacherAssignments(teachers);
    
    // Clear existing assignments
    weekDays.forEach(day => {
      Object.keys(newTimetable[day]).forEach(periodId => {
        newTimetable[day][periodId] = {
          periodId,
          subject: null,
          teacher: null
        };
      });
    });
    
    // First pass: Assign main subjects with optimal distribution
    // We'll go day by day to ensure even distribution
    weekDays.forEach(day => {
      const dayPeriods = regularPeriods.map(p => p.id);
      const morningPeriods = dayPeriods.slice(0, Math.ceil(dayPeriods.length / 2));
      const afternoonPeriods = dayPeriods.slice(Math.ceil(dayPeriods.length / 2));
      
      // First assign main subjects to morning periods
      morningPeriods.forEach((periodId, periodIndex) => {
        // Find best subject for this slot based on priority, required classes, and days since last assigned
        const eligibleSubjects = subjects
          .filter(s => {
            const subjectData = subjectDistribution[s.name];
            return subjectData.assigned < subjectData.required;
          })
          .sort((a, b) => {
            const aData = subjectDistribution[a.name];
            const bData = subjectDistribution[b.name];
            
            // Calculate priority score based on multiple factors
            const aScore = (aData.weight * 10) + 
                           (aData.daysSinceLastAssigned[day] * 5) + 
                           ((aData.required - aData.assigned) / aData.required * 20);
            
            const bScore = (bData.weight * 10) + 
                           (bData.daysSinceLastAssigned[day] * 5) + 
                           ((bData.required - bData.assigned) / bData.required * 20);
            
            return bScore - aScore; // Higher score first
          });
        
        if (eligibleSubjects.length > 0) {
          const subject = eligibleSubjects[0];
          
          // Find best teacher for this subject and time slot
          const eligibleTeachers = teachers
            .filter(t => {
              const teacherData = teacherAssignments[t.name];
              // Check subject qualification
              if (!t.subjects.includes(subject.name)) return false;
              
              // Check availability
              const isMorning = periodIndex < Math.ceil(dayPeriods.length / 2);
              if (isMorning && !t.availability[day]?.morning) return false;
              if (!isMorning && !t.availability[day]?.afternoon) return false;
              
              // Check workload
              if (teacherData.assigned >= teacherData.maxLoad) return false;
              if (teacherData.dayLoad[day] >= 4) return false; // Max 4 classes per day
              
              return true;
            })
            .sort((a, b) => {
              const aData = teacherAssignments[a.name];
              const bData = teacherAssignments[b.name];
              
              // Calculate teacher score based on workload balance
              const aScore = ((aData.maxLoad - aData.assigned) / aData.maxLoad * 10) - 
                             (aData.dayLoad[day] * 2);
              
              const bScore = ((bData.maxLoad - bData.assigned) / bData.maxLoad * 10) - 
                             (bData.dayLoad[day] * 2);
              
              return bScore - aScore; // Higher score first
            });
          
          if (eligibleTeachers.length > 0) {
            const teacher = eligibleTeachers[0];
            
            // Assign the subject and teacher
            newTimetable[day][periodId] = {
              periodId,
              subject: subject.name,
              teacher: teacher.name
            };
            
            // Update tracking
            updateSubjectDistribution(subject.name, day, true);
            updateTeacherAssignments(teacher.name, day, periodIndex, true);
          }
        }
      });
      
      // Then assign remaining subjects to afternoon periods
      afternoonPeriods.forEach((periodId, periodIndex) => {
        const actualPeriodIndex = periodIndex + morningPeriods.length;
        
        // Skip if already assigned
        if (newTimetable[day][periodId].subject) return;
        
        // Find best subject with similar logic as before
        const eligibleSubjects = subjects
          .filter(s => {
            const subjectData = subjectDistribution[s.name];
            return subjectData.assigned < subjectData.required;
          })
          .sort((a, b) => {
            const aData = subjectDistribution[a.name];
            const bData = subjectDistribution[b.name];
            
            // Prioritize subjects that need to be allocated more urgently
            const aScore = ((aData.required - aData.assigned) / aData.required * 20) + 
                           (aData.daysSinceLastAssigned[day] * 5);
            
            const bScore = ((bData.required - bData.assigned) / bData.required * 20) + 
                           (bData.daysSinceLastAssigned[day] * 5);
            
            return bScore - aScore;
          });
        
        if (eligibleSubjects.length > 0) {
          const subject = eligibleSubjects[0];
          
          // Find suitable teacher with similar logic as before
          const eligibleTeachers = teachers
            .filter(t => {
              const teacherData = teacherAssignments[t.name];
              if (!t.subjects.includes(subject.name)) return false;
              if (!t.availability[day]?.afternoon) return false;
              if (teacherData.assigned >= teacherData.maxLoad) return false;
              if (teacherData.dayLoad[day] >= 4) return false;
              return true;
            })
            .sort((a, b) => {
              const aData = teacherAssignments[a.name];
              const bData = teacherAssignments[b.name];
              
              const aScore = ((aData.maxLoad - aData.assigned) / aData.maxLoad * 10) - 
                             (aData.dayLoad[day] * 2);
              
              const bScore = ((bData.maxLoad - bData.assigned) / bData.maxLoad * 10) - 
                             (bData.dayLoad[day] * 2);
              
              return bScore - aScore;
            });
          
          if (eligibleTeachers.length > 0) {
            const teacher = eligibleTeachers[0];
            
            newTimetable[day][periodId] = {
              periodId,
              subject: subject.name,
              teacher: teacher.name
            };
            
            updateSubjectDistribution(subject.name, day, true);
            updateTeacherAssignments(teacher.name, day, actualPeriodIndex, true);
          }
        }
      });
    });
    
    // Second pass: Fill any remaining slots
    let iterations = 0;
    let filledSlots = true;
    
    // Continue trying to fill slots until we can't fill any more or reach max iterations
    while (filledSlots && iterations < 3) {
      filledSlots = false;
      iterations++;
      
      weekDays.forEach(day => {
        Object.keys(newTimetable[day]).forEach((periodId, periodIndex) => {
          if (!newTimetable[day][periodId].subject) {
            // Get remaining subjects that need more classes
            const remainingSubjects = subjects.filter(s => {
              const data = subjectDistribution[s.name];
              return data.assigned < data.required;
            });
            
            if (remainingSubjects.length > 0) {
              // Sort by most urgent to allocate
              remainingSubjects.sort((a, b) => {
                const aData = subjectDistribution[a.name];
                const bData = subjectDistribution[b.name];
                
                const aRemaining = aData.required - aData.assigned;
                const bRemaining = bData.required - bData.assigned;
                
                return bRemaining - aRemaining;
              });
              
              const subject = remainingSubjects[0];
              
              // Find available teacher
              const isMorningPeriod = periodIndex < Math.ceil(Object.keys(newTimetable[day]).length / 2);
              const availableTeachers = teachers.filter(t => {
                const teacherData = teacherAssignments[t.name];
                if (!t.subjects.includes(subject.name)) return false;
                if (isMorningPeriod && !t.availability[day]?.morning) return false;
                if (!isMorningPeriod && !t.availability[day]?.afternoon) return false;
                if (teacherData.assigned >= teacherData.maxLoad) return false;
                if (teacherData.dayLoad[day] >= 4) return false;
                
                return true;
              });
              
              if (availableTeachers.length > 0) {
                // Sort by least assigned
                availableTeachers.sort((a, b) => {
                  return teacherAssignments[a.name].assigned - teacherAssignments[b.name].assigned;
                });
                
                const teacher = availableTeachers[0];
                
                newTimetable[day][periodId] = {
                  periodId,
                  subject: subject.name,
                  teacher: teacher.name
                };
                
                updateSubjectDistribution(subject.name, day, true);
                updateTeacherAssignments(teacher.name, day, periodIndex, true);
                
                filledSlots = true;
              }
            }
          }
        });
      });
    }
    
    setTimetable(newTimetable);
    setIsGenerated(true);
    
    toast({
      title: "Timetable Generated",
      description: "Timetable has been generated with optimal distribution of subjects and teachers.",
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
    
    setDialogOpen(true);
  };
  
  const handleAssignSlot = () => {
    if (selectedDay && selectedPeriod) {
      const newTimetable = { ...timetable };
      const currentSlot = newTimetable[selectedDay][selectedPeriod];
      
      // Remove existing subject and teacher if any
      if (currentSlot.subject) {
        updateSubjectDistribution(currentSlot.subject, selectedDay, false);
        if (currentSlot.teacher) {
          const periodIndex = periods.findIndex(p => p.id === selectedPeriod);
          updateTeacherAssignments(currentSlot.teacher, selectedDay, periodIndex, false);
        }
      }
      
      // Find best teacher for the selected subject
      let bestTeacher = null;
      if (selectedSubject) {
        const eligibleTeachers = getEligibleTeachers(selectedSubject);
        
        if (eligibleTeachers.length > 0) {
          // Sort by least assigned teachers
          eligibleTeachers.sort((a, b) => {
            const aAssigned = teacherAssignments[a.name]?.assigned || 0;
            const bAssigned = teacherAssignments[b.name]?.assigned || 0;
            return aAssigned - bAssigned;
          });
          
          bestTeacher = eligibleTeachers[0].name;
          
          // Update tracking
          updateSubjectDistribution(selectedSubject, selectedDay, true);
          const periodIndex = periods.findIndex(p => p.id === selectedPeriod);
          updateTeacherAssignments(bestTeacher, selectedDay, periodIndex, true);
        }
      }
      
      newTimetable[selectedDay][selectedPeriod] = {
        periodId: selectedPeriod,
        subject: selectedSubject || null,
        teacher: bestTeacher
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
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      onClick={handleGenerateTimetable}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Timetable
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate an optimized timetable considering subject importance, teacher workloads, and pedagogical best practices</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={!isGenerated}
                      onClick={handlePrintTimetable}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Print timetable or save as PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
            <DialogTitle>Assign Subject</DialogTitle>
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
            
            {selectedSubject && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right text-sm font-medium">
                  Teacher
                </div>
                <div className="col-span-3 text-sm">
                  {getEligibleTeachers(selectedSubject).length > 0 ? (
                    <div className="p-2 bg-muted/20 rounded">
                      <p>Teacher will be automatically assigned based on:</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                        <li>Current workload balance</li>
                        <li>Subject specialization</li>
                        <li>Availability on {selectedDay}</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-destructive">
                      No eligible teachers available for this subject
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignSlot}
              disabled={!selectedSubject || getEligibleTeachers(selectedSubject).length === 0}
            >
              Assign
            </Button>
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

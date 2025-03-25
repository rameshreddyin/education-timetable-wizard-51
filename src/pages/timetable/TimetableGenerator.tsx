
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    subjectAssignments: {[subjectName: string]: number};
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
  
  const [editTeacherDialogOpen, setEditTeacherDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editedClassesPerWeek, setEditedClassesPerWeek] = useState<number>(0);
  
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
      const subjectAssignments: {[subjectName: string]: number} = {};
      
      weekDays.forEach(day => {
        dayLoad[day] = 0;
        consecutiveClasses[day] = 0;
      });
      
      teacher.subjects.forEach(subject => {
        subjectAssignments[subject] = 0;
      });
      
      assignments[teacher.name] = {
        assigned: 0,
        maxLoad: teacher.classesPerWeek,
        subjectAssignments,
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
  
  const updateTeacherAssignments = (teacher: string, subject: string, day: string, periodIndex: number, isAdding: boolean) => {
    setTeacherAssignments(prev => {
      if (!prev[teacher]) return prev;
      
      const updated = {...prev};
      
      if (isAdding) {
        // Increment assigned count
        updated[teacher].assigned += 1;
        
        // Increment subject assignments
        if (updated[teacher].subjectAssignments[subject] !== undefined) {
          updated[teacher].subjectAssignments[subject] += 1;
        }
        
        // Increment day load
        updated[teacher].dayLoad[day] += 1;
        
        // Update consecutive classes
        updated[teacher].consecutiveClasses[day] = periodIndex;
      } else {
        // Decrement assigned count
        updated[teacher].assigned = Math.max(0, updated[teacher].assigned - 1);
        
        // Decrement subject assignments
        if (updated[teacher].subjectAssignments[subject] !== undefined) {
          updated[teacher].subjectAssignments[subject] = Math.max(0, updated[teacher].subjectAssignments[subject] - 1);
        }
        
        // Decrement day load
        updated[teacher].dayLoad[day] = Math.max(0, updated[teacher].dayLoad[day] - 1);
      }
      
      return updated;
    });
  };
  
  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditedClassesPerWeek(teacher.classesPerWeek);
    setEditTeacherDialogOpen(true);
  };
  
  const handleSaveTeacherEdit = () => {
    if (!selectedTeacher) return;
    
    const updatedTeachers = teachers.map(teacher => 
      teacher.id === selectedTeacher.id 
        ? { ...teacher, classesPerWeek: editedClassesPerWeek }
        : teacher
    );
    
    setTeachers(updatedTeachers);
    sessionStorage.setItem('teachers', JSON.stringify(updatedTeachers));
    
    // Update teacher assignments
    const updatedAssignments = { ...teacherAssignments };
    if (updatedAssignments[selectedTeacher.name]) {
      updatedAssignments[selectedTeacher.name].maxLoad = editedClassesPerWeek;
      setTeacherAssignments(updatedAssignments);
    }
    
    setEditTeacherDialogOpen(false);
    
    toast({
      title: "Teacher Updated",
      description: `Maximum classes per week for ${selectedTeacher.name} updated to ${editedClassesPerWeek}.`,
    });
  };
  
  // Advanced timetable generation algorithm
  const handleGenerateTimetable = () => {
    // Reset the timetable
    initializeTimetable();
    const newTimetable = { ...timetable };
    
    // Reset tracking
    initializeSubjectDistribution(subjects);
    initializeTeacherAssignments(teachers);
    
    // Get all regular periods sorted by time
    const regularPeriods = periods
      .filter(p => p.type === 'Regular')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(p => p.id);
      
    // Calculate total required classes per subject
    const totalRequiredClasses = subjects.reduce((total, subject) => total + subject.classesPerWeek, 0);
    console.log(`Total required classes: ${totalRequiredClasses}`);
    
    // First, create a priority queue for subjects based on type and classes per week
    const subjectPriorities = [...subjects].sort((a, b) => {
      // First sort by type (Main > Secondary > Elective)
      const typeWeight = {
        'Main': 3,
        'Secondary': 2,
        'Elective': 1
      };
      
      const typeComparison = typeWeight[b.type] - typeWeight[a.type];
      if (typeComparison !== 0) return typeComparison;
      
      // Then by classes per week (higher first)
      return b.classesPerWeek - a.classesPerWeek;
    });
    
    // For each subject, distribute classes across the week
    subjectPriorities.forEach(subject => {
      let assignedClasses = 0;
      const targetClasses = subject.classesPerWeek;
      
      // Track which days we've already assigned this subject to
      const assignedDays: Record<string, number> = {};
      weekDays.forEach(day => {
        assignedDays[day] = 0;
      });
      
      // Try to distribute evenly across days first
      while (assignedClasses < targetClasses) {
        // Find the day with the fewest assignments for this subject
        const dayWithFewestAssignments = weekDays.sort((a, b) => assignedDays[a] - assignedDays[b])[0];
        
        // Find available teachers for this subject
        const eligibleTeachers = teachers.filter(teacher => {
          return teacher.subjects.includes(subject.name) &&
                 teacherAssignments[teacher.name].assigned < teacherAssignments[teacher.name].maxLoad &&
                 teacherAssignments[teacher.name].dayLoad[dayWithFewestAssignments] < 3; // Limit to 3 classes per day
        });
        
        if (eligibleTeachers.length === 0) {
          console.log(`No eligible teachers for ${subject.name} on ${dayWithFewestAssignments}`);
          break; // No teachers available, can't assign more classes
        }
        
        // Sort teachers by workload (least busy first)
        eligibleTeachers.sort((a, b) => {
          return teacherAssignments[a.name].assigned - teacherAssignments[b.name].assigned;
        });
        
        const selectedTeacher = eligibleTeachers[0];
        
        // Find an available slot on this day
        const availableSlots = regularPeriods.filter(periodId => {
          return !newTimetable[dayWithFewestAssignments][periodId].subject;
        });
        
        if (availableSlots.length === 0) {
          console.log(`No available slots on ${dayWithFewestAssignments}`);
          // Mark this day as fully booked for this iteration
          assignedDays[dayWithFewestAssignments] = 999;
          continue;
        }
        
        // Pick first available slot (morning first)
        const selectedSlot = availableSlots[0];
        
        // Assign the subject and teacher
        newTimetable[dayWithFewestAssignments][selectedSlot] = {
          periodId: selectedSlot,
          subject: subject.name,
          teacher: selectedTeacher.name
        };
        
        // Update tracking
        updateSubjectDistribution(subject.name, dayWithFewestAssignments, true);
        updateTeacherAssignments(
          selectedTeacher.name, 
          subject.name,
          dayWithFewestAssignments, 
          regularPeriods.indexOf(selectedSlot), 
          true
        );
        
        // Update assigned count
        assignedClasses++;
        assignedDays[dayWithFewestAssignments]++;
      }
    });
    
    // Second pass: Fill any remaining slots with subjects that still need assignments
    let remainingSubjects = subjects.filter(subject => {
      return subjectDistribution[subject.name].assigned < subject.classesPerWeek;
    });
    
    if (remainingSubjects.length > 0) {
      console.log("Remaining subjects that need assignments:", remainingSubjects.map(s => s.name));
      
      // Try to assign remaining classes
      weekDays.forEach(day => {
        regularPeriods.forEach(periodId => {
          // Skip if slot is already filled
          if (newTimetable[day][periodId].subject) return;
          
          // Update remaining subjects that still need assignments
          remainingSubjects = subjects.filter(subject => {
            return subjectDistribution[subject.name].assigned < subject.classesPerWeek;
          });
          
          if (remainingSubjects.length === 0) return;
          
          // Sort by most urgent (highest percentage of classes still unassigned)
          remainingSubjects.sort((a, b) => {
            const aAssigned = subjectDistribution[a.name].assigned;
            const aRequired = a.classesPerWeek;
            const aPercentComplete = aAssigned / aRequired;
            
            const bAssigned = subjectDistribution[b.name].assigned;
            const bRequired = b.classesPerWeek;
            const bPercentComplete = bAssigned / bRequired;
            
            return aPercentComplete - bPercentComplete;
          });
          
          const subjectToAssign = remainingSubjects[0];
          
          // Find teachers for this subject with availability on this day
          const availableTeachers = teachers.filter(teacher => {
            // Check if teacher teaches this subject
            if (!teacher.subjects.includes(subjectToAssign.name)) return false;
            
            // Check if teacher has capacity left
            if (teacherAssignments[teacher.name].assigned >= teacherAssignments[teacher.name].maxLoad) return false;
            
            // Check if teacher already has too many classes on this day
            if (teacherAssignments[teacher.name].dayLoad[day] >= 3) return false;
            
            // Check if teacher is available at this time (morning/afternoon)
            const periodIndex = regularPeriods.indexOf(periodId);
            const isMorning = periodIndex < Math.floor(regularPeriods.length / 2);
            
            if (isMorning && !teacher.availability[day]?.morning) return false;
            if (!isMorning && !teacher.availability[day]?.afternoon) return false;
            
            return true;
          });
          
          if (availableTeachers.length === 0) return; // No teachers available for this subject
          
          // Choose the teacher with the fewest assignments
          availableTeachers.sort((a, b) => {
            return teacherAssignments[a.name].assigned - teacherAssignments[b.name].assigned;
          });
          
          const selectedTeacher = availableTeachers[0];
          
          // Assign the subject and teacher
          newTimetable[day][periodId] = {
            periodId,
            subject: subjectToAssign.name,
            teacher: selectedTeacher.name
          };
          
          // Update tracking
          updateSubjectDistribution(subjectToAssign.name, day, true);
          updateTeacherAssignments(
            selectedTeacher.name, 
            subjectToAssign.name,
            day, 
            regularPeriods.indexOf(periodId), 
            true
          );
        });
      });
    }
    
    setTimetable(newTimetable);
    setIsGenerated(true);
    
    // Check if all subject requirements were met
    const unfulfilledSubjects = subjects.filter(subject => {
      return subjectDistribution[subject.name].assigned < subject.classesPerWeek;
    });
    
    if (unfulfilledSubjects.length > 0) {
      toast({
        title: "Timetable Generated With Warnings",
        description: `Could not fulfill all requirements for ${unfulfilledSubjects.length} subjects. Consider adjusting teacher availability or class requirements.`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Timetable Generated Successfully",
        description: "Timetable has been generated with optimal distribution of subjects and teachers.",
      });
    }
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
          updateTeacherAssignments(currentSlot.teacher, currentSlot.subject, selectedDay, periodIndex, false);
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
          updateTeacherAssignments(bestTeacher, selectedSubject, selectedDay, periodIndex, true);
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
        
        {/* Teacher Workload Management Card */}
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>Teacher Workload Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="text-center">Max Classes Per Week</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map(teacher => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map(subject => (
                            <span 
                              key={subject} 
                              className="px-2 py-0.5 bg-muted rounded-full text-xs"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{teacher.classesPerWeek}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditTeacher(teacher)}
                        >
                          Edit Workload
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
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
      
      {/* Edit Teacher Dialog */}
      <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher Workload</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacherName" className="text-right">
                Teacher Name
              </Label>
              <div className="col-span-3 font-medium">
                {selectedTeacher?.name}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxClasses" className="text-right">
                Max Classes Per Week
              </Label>
              <Input
                id="maxClasses"
                type="number"
                min="1"
                max="30"
                className="col-span-3"
                value={editedClassesPerWeek}
                onChange={(e) => setEditedClassesPerWeek(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right text-sm font-medium">
                Subjects
              </div>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-1">
                  {selectedTeacher?.subjects.map(subject => (
                    <span 
                      key={subject} 
                      className="px-2 py-0.5 bg-muted rounded-full text-xs"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="col-span-4">
              <div className="bg-muted/20 p-3 rounded-md text-sm">
                <p className="font-medium text-foreground">Recommended Workload:</p>
                <p className="text-muted-foreground mt-1">
                  Based on subjects taught and class requirements, 
                  {selectedTeacher && calculateRecommendedWorkload(selectedTeacher)} classes per week is recommended.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacherDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeacherEdit}>
              Save Changes
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

// Helper function to calculate recommended workload for a teacher
function calculateRecommendedWorkload(teacher: Teacher): string {
  // Get subjects from session storage
  const storedSubjects = sessionStorage.getItem('subjects');
  if (!storedSubjects) return "unknown";
  
  const subjects = JSON.parse(storedSubjects) as Subject[];
  
  // Calculate total classes needed for subjects this teacher teaches
  let totalClassesNeeded = 0;
  const teacherSubjects = teacher.subjects;
  
  teacherSubjects.forEach(subjectName => {
    const subject = subjects.find(s => s.name === subjectName);
    if (subject) {
      totalClassesNeeded += subject.classesPerWeek;
    }
  });
  
  // Calculate how many teachers teach each of these subjects
  const teachersPerSubject: Record<string, number> = {};
  
  // Get teachers from session storage
  const storedTeachers = sessionStorage.getItem('teachers');
  if (storedTeachers) {
    const allTeachers = JSON.parse(storedTeachers) as Teacher[];
    
    teacherSubjects.forEach(subjectName => {
      teachersPerSubject[subjectName] = allTeachers.filter(t => 
        t.subjects.includes(subjectName)
      ).length;
    });
  }
  
  // Calculate recommended workload based on fair distribution
  let recommendedWorkload = 0;
  
  teacherSubjects.forEach(subjectName => {
    const subject = subjects.find(s => s.name === subjectName);
    if (subject && teachersPerSubject[subjectName]) {
      // Fair share of classes for this subject
      const fairShare = Math.ceil(subject.classesPerWeek / teachersPerSubject[subjectName]);
      recommendedWorkload += fairShare;
    }
  });
  
  // Provide a range for flexibility
  const minRecommended = Math.max(5, recommendedWorkload - 2);
  const maxRecommended = recommendedWorkload + 2;
  
  return `${minRecommended}-${maxRecommended}`;
}

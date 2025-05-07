
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, Plus, Printer, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

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

type ResourceAlert = {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
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
  
  // Resources alerts for warnings and information
  const [resourceAlerts, setResourceAlerts] = useState<ResourceAlert[]>([]);
  
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
    
    // Validate resources
    validateResources();
  }, []);
  
  // Re-initialize timetable when periods change
  useEffect(() => {
    if (periods.length > 0) {
      initializeTimetable();
    }
  }, [periods]);
  
  // Validate resources when subjects or teachers change
  useEffect(() => {
    validateResources();
  }, [subjects, teachers, periods]);
  
  const validateResources = () => {
    const alerts: ResourceAlert[] = [];
    
    // Check if we have subjects
    if (subjects.length === 0) {
      alerts.push({
        type: 'warning',
        title: 'No subjects defined',
        description: 'Please go back and define subjects before generating a timetable.'
      });
    }
    
    // Check if we have teachers
    if (teachers.length === 0) {
      alerts.push({
        type: 'warning',
        title: 'No teachers defined',
        description: 'Please go back and define teachers before generating a timetable.'
      });
    }
    
    // Check for subjects with no assigned teachers
    const subjectsWithoutTeachers: string[] = [];
    subjects.forEach(subject => {
      const hasTeacher = teachers.some(teacher => teacher.subjects.includes(subject.name));
      if (!hasTeacher) {
        subjectsWithoutTeachers.push(subject.name);
      }
    });
    
    if (subjectsWithoutTeachers.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Subjects without teachers',
        description: `The following subjects have no assigned teachers: ${subjectsWithoutTeachers.join(', ')}`
      });
    }
    
    // Calculate total required classes vs available periods
    const totalRequiredClasses = subjects.reduce((total, subject) => total + subject.classesPerWeek, 0);
    const regularPeriods = periods.filter(p => p.type === 'Regular').length;
    const totalAvailablePeriods = regularPeriods * weekDays.length;
    
    if (totalRequiredClasses > totalAvailablePeriods) {
      alerts.push({
        type: 'error',
        title: 'Insufficient time slots',
        description: `Required classes (${totalRequiredClasses}) exceed available periods (${totalAvailablePeriods}). Consider reducing subject classes or adding more periods.`
      });
    }
    
    // Check teacher capacity
    const totalTeacherCapacity = teachers.reduce((total, teacher) => total + teacher.classesPerWeek, 0);
    if (totalTeacherCapacity < totalRequiredClasses) {
      alerts.push({
        type: 'warning',
        title: 'Insufficient teacher capacity',
        description: `Teacher capacity (${totalTeacherCapacity} classes) is less than required classes (${totalRequiredClasses}). Some classes may not be assigned.`
      });
    }
    
    setResourceAlerts(alerts);
  };
  
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
    
    // Revalidate resources
    validateResources();
  };
  
  // Calculate total classes required and allocated
  const getTotalRequiredClasses = () => {
    return subjects.reduce((total, subject) => total + subject.classesPerWeek, 0);
  };
  
  const getTotalAllocatedClasses = () => {
    return Object.values(subjectDistribution).reduce((total, subject) => total + subject.assigned, 0);
  };
  
  // Calculate allocation percentage
  const getAllocationPercentage = () => {
    const required = getTotalRequiredClasses();
    const allocated = getTotalAllocatedClasses();
    return required > 0 ? Math.round((allocated / required) * 100) : 0;
  };
  
  // Enhanced timetable generation algorithm with better error handling
  const handleGenerateTimetable = () => {
    // Reset the timetable
    initializeTimetable();
    const newTimetable = { ...timetable };
    
    // Reset tracking
    initializeSubjectDistribution(subjects);
    initializeTeacherAssignments(teachers);
    
    // Validate resources first
    validateResources();
    if (resourceAlerts.some(alert => alert.type === 'error')) {
      toast({
        title: "Cannot Generate Timetable",
        description: "Please resolve error conditions before generating the timetable.",
        variant: "destructive"
      });
      return;
    }
    
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
    
    // Track allocation failures for reporting
    const allocationIssues = {
      noEligibleTeachers: new Set<string>(),
      noAvailableSlots: new Set<string>(),
    };
    
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
          allocationIssues.noEligibleTeachers.add(`${subject.name} on ${dayWithFewestAssignments}`);
          // Mark this day as fully booked for this subject
          assignedDays[dayWithFewestAssignments] = 999;
          
          // If all days are marked as booked, break out of the loop
          if (Object.values(assignedDays).every(count => count === 999)) {
            break;
          }
          
          continue;
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
          allocationIssues.noAvailableSlots.add(dayWithFewestAssignments);
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
    
    // Prepare detailed warnings
    const warnings = [];
    
    if (allocationIssues.noEligibleTeachers.size > 0) {
      warnings.push(`No eligible teachers for: ${Array.from(allocationIssues.noEligibleTeachers).join(', ')}`);
    }
    
    if (allocationIssues.noAvailableSlots.size > 0) {
      warnings.push(`No available slots on: ${Array.from(allocationIssues.noAvailableSlots).join(', ')}`);
    }
    
    if (unfulfilledSubjects.length > 0) {
      const subjectDetails = unfulfilledSubjects.map(subject => {
        const assigned = subjectDistribution[subject.name].assigned;
        const total = subject.classesPerWeek;
        return `${subject.name} (${assigned}/${total})`;
      }).join(', ');
      
      warnings.push(`Incomplete allocation for: ${subjectDetails}`);
      
      toast({
        title: "Timetable Generated With Warnings",
        description: `Could not fulfill all requirements for ${unfulfilledSubjects.length} subjects. Some slots are intentionally left empty.`,
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
        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="font-semibold text-lg">Subject Statistics</h3>
                <div className="flex justify-between text-sm">
                  <span>Total Subjects:</span>
                  <span className="font-semibold">{subjects.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Main Subjects:</span>
                  <span className="font-semibold">{subjects.filter(s => s.type === 'Main').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Secondary Subjects:</span>
                  <span className="font-semibold">{subjects.filter(s => s.type === 'Secondary').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="font-semibold text-lg">Class Requirements</h3>
                <div className="flex justify-between text-sm">
                  <span>Required Classes:</span>
                  <span className="font-semibold">{getTotalRequiredClasses()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Allocated Classes:</span>
                  <span className="font-semibold">{getTotalAllocatedClasses()}</span>
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between text-xs">
                    <span>Completion:</span>
                    <span>{getAllocationPercentage()}%</span>
                  </div>
                  <Progress value={getAllocationPercentage()} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="font-semibold text-lg">Teacher Allocation</h3>
                <div className="flex justify-between text-sm">
                  <span>Total Teachers:</span>
                  <span className="font-semibold">{teachers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available Periods:</span>
                  <span className="font-semibold">
                    {periods.filter(p => p.type === 'Regular').length * weekDays.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Classes/Week:</span>
                  <span className="font-semibold">
                    {teachers.reduce((total, teacher) => total + teacher.classesPerWeek, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Alerts */}
        {resourceAlerts.length > 0 && (
          <div className="space-y-2 mb-6">
            {resourceAlerts.map((alert, index) => (
              <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Subject Allocation Cards */}
        <Card className="w-full mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Subject Allocation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(subjectDistribution).map(([subjectName, data]) => (
                <div key={subjectName} className="bg-secondary rounded-md p-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{subjectName}</span>
                    <span className="text-sm">
                      {data.assigned}/{data.required} classes
                    </span>
                  </div>
                  <Progress 
                    value={data.required > 0 ? (data.assigned / data.required) * 100 : 0} 
                    className="h-1.5" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                    <p>Auto-generate optimal timetable</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {isGenerated && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={handlePrintTimetable}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Timetable
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Print or download as PDF</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="overflow-x-auto">
              <Table className="border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Time / Day</TableHead>
                    {weekDays.map((day) => (
                      <TableHead key={day}>{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAllPeriods().map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">
                        <div>{period.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(period.startTime)} - {formatTime(period.endTime)}
                        </div>
                      </TableCell>
                      
                      {weekDays.map((day) => {
                        // For break or lunch periods
                        if (period.type !== 'Regular') {
                          return (
                            <TableCell 
                              key={`${day}-${period.id}`} 
                              className="text-center bg-muted/30 italic"
                              colSpan={1}
                            >
                              {period.type}
                            </TableCell>
                          );
                        }
                        
                        // For regular periods
                        const slot = timetable[day]?.[period.id];
                        const hasAssignment = slot && slot.subject;
                        
                        return (
                          <TableCell 
                            key={`${day}-${period.id}`}
                            className={`cursor-pointer hover:bg-muted/30 ${hasAssignment ? 'bg-secondary/40' : ''}`}
                            onClick={() => handleSlotClick(day, period.id)}
                          >
                            {hasAssignment ? (
                              <div>
                                <div className="font-medium">{slot.subject}</div>
                                <div className="text-xs text-muted-foreground">{slot.teacher}</div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <Plus className="h-4 w-4" />
                                <span className="ml-1">Assign</span>
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
      
      {/* Edit Timetable Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Class</DialogTitle>
            <DialogDescription>
              Assign a subject to this time slot. A teacher will be automatically selected based on availability.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="subject" className="mb-2 block">
                Select Subject
              </Label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
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
            
            <div className="text-sm">
              <Label className="mb-2 block">Available Teachers</Label>
              <div className="p-3 border rounded-md">
                {selectedSubject ? (
                  getEligibleTeachers(selectedSubject).length > 0 ? (
                    <ul className="space-y-1">
                      {getEligibleTeachers(selectedSubject).map((teacher) => (
                        <li key={teacher.id} className="text-sm">
                          {teacher.name} - {teacherAssignments[teacher.name]?.assigned || 0}/{teacher.classesPerWeek} classes assigned
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No teachers available for this subject</p>
                  )
                ) : (
                  <p className="text-muted-foreground">Select a subject first</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSlot}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Teacher Dialog */}
      <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Teacher Load
              {selectedTeacher && <span className="ml-2 text-sm font-normal">({selectedTeacher.name})</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxClasses" className="text-right">
                Max Classes/Week
              </Label>
              <Input
                id="maxClasses"
                type="number"
                min={1}
                max={40}
                value={editedClassesPerWeek}
                onChange={(e) => setEditedClassesPerWeek(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            
            {selectedTeacher && (
              <div className="text-sm">
                <label className="block font-medium mb-1">Subjects:</label>
                <ul className="list-disc pl-4">
                  {selectedTeacher.subjects.map((subject, index) => (
                    <li key={index}>{subject}</li>
                  ))}
                </ul>
              </div>
            )}
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

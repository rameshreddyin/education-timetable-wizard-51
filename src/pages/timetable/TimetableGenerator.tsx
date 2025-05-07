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
import { Badge } from '@/components/ui/badge';

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
  
  // Enhanced timetable generation algorithm with better error handling and prevention of over-allocation
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
      
      // FIX: Check if we've already reached the target class count to avoid over-allocation
      if (assignedClasses >= targetClasses) {
        console.log(`Subject ${subject.name} already has required ${targetClasses} classes assigned. Skipping further allocation.`);
        return;
      }
      
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
        
        // FIX: Double check that we haven't exceeded the target class count before assignment
        if (assignedClasses >= targetClasses) {
          console.log(`Reached the target of ${targetClasses} classes for ${subject.name}. Stopping allocation.`);
          break;
        }
        
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
        
        // FIX: Add more verbose logging to track allocation
        console.log(`Assigned ${subject.name} class ${assignedClasses}/${targetClasses} to ${dayWithFewestAssignments}`);
      }
    });
    
    // Second pass: Fill any remaining slots with subjects that still need assignments
    let remainingSubjects = subjects.filter(subject => {
      // FIX: Compare current allocation to required amount and only return subjects that need more classes
      const currentAssigned = subjectDistribution[subject.name].assigned;
      const requiredClasses = subject.classesPerWeek;
      return currentAssigned < requiredClasses;
    });
    
    if (remainingSubjects.length > 0) {
      console.log("Remaining subjects that need assignments:", remainingSubjects.map(s => `${s.name} (${subjectDistribution[s.name].assigned}/${s.classesPerWeek})`));
      
      // Try to assign remaining classes
      weekDays.forEach(day => {
        regularPeriods.forEach(periodId => {
          // Skip if slot is already filled
          if (newTimetable[day][periodId].subject) return;
          
          // Update remaining subjects that still need assignments
          remainingSubjects = subjects.filter(subject => {
            const currentAssigned = subjectDistribution[subject.name].assigned;
            const requiredClasses = subject.classesPerWeek;
            // FIX: Only include subjects that need more classes
            return currentAssigned < requiredClasses;
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
          
          // FIX: Double check that we haven't exceeded the target class count before assignment
          if (subjectDistribution[subjectToAssign.name].assigned >= subjectToAssign.classesPerWeek) {
            console.log(`Subject ${subjectToAssign.name} already fully allocated. Skipping.`);
            return;
          }
          
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
          
          // FIX: Add verbose logging for second pass assignment
          console.log(`Second pass: Assigned ${subjectToAssign.name} to ${day}, now at ${subjectDistribution[subjectToAssign.name].assigned}/${subjectToAssign.classesPerWeek}`);
        });
      });
    }
    
    setTimetable(newTimetable);
    setIsGenerated(true);
    
    // Check if all subject requirements were met
    const unfulfilledSubjects = subjects.filter(subject => {
      return subjectDistribution[subject.name].assigned < subject.classesPerWeek;
    });
    
    const overallocatedSubjects = subjects.filter(subject => {
      // FIX: Check for over-allocated subjects
      return subjectDistribution[subject.name].assigned > subject.classesPerWeek;
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
        variant: "warning"
      });
    } else if (overallocatedSubjects.length > 0) {
      // FIX: Add warning for over-allocated subjects
      const subjectDetails = overallocatedSubjects.map(subject => {
        const assigned = subjectDistribution[subject.name].assigned;
        const total = subject.classesPerWeek;
        return `${subject.name} (${assigned}/${total})`;
      }).join(', ');
      
      warnings.push(`Over-allocation detected for: ${subjectDetails}`);
      
      toast({
        title: "Timetable Generated With Warnings",
        description: `Some subjects have been allocated more classes than required. Please review the timetable.`,
        variant: "warning"
      });
    } else {
      toast({
        title: "Timetable Generated Successfully",
        description: "Timetable has been generated with optimal distribution of subjects and teachers.",
      });
    }
    
    // FIX: Log detailed allocation statistics
    console.log("Final subject allocation status:");
    subjects.forEach(subject => {
      console.log(`${subject.name}: ${subjectDistribution[subject.name].assigned}/${subject.classesPerWeek} classes allocated`);
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
  
  // Get teacher names for a subject
  const getTeachersForSubject = (subjectName: string) => {
    return teachers
      .filter(teacher => teacher.subjects.includes(subjectName))
      .map(teacher => teacher.name);
  };
  
  // Calculate teacher workload percentage
  const getTeacherWorkloadPercentage = (teacherName: string) => {
    const teacher = teachers.find(t => t.name === teacherName);
    if (!teacher) return 0;
    
    const assigned = teacherAssignments[teacherName]?.assigned || 0;
    const maxLoad = teacher.classesPerWeek;
    
    return maxLoad > 0 ? Math.round((assigned / maxLoad) * 100) : 0;
  };
  
  // Check if a subject is under-allocated
  const isSubjectUnderAllocated = (subjectName: string) => {
    const data = subjectDistribution[subjectName];
    if (!data) return false;
    return data.assigned < data.required;
  };
  
  // FIX: Add function to check if a subject is over-allocated
  const isSubjectOverAllocated = (subjectName: string) => {
    const data = subjectDistribution[subjectName];
    if (!data) return false;
    return data.assigned > data.required;
  };
  
  return (
    <Layout 
      title="Timetable Generator" 
      subtitle="Step 5 of 5 - Create and review timetable"
      className="max-w-full"
    >
      <div className="grid gap-6">
        {/* Resources Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Resource Status</CardTitle>
              <div className="flex items-center gap-3">
                <Select 
                  value={selectedClass + '-' + selectedSection} 
                  disabled
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={selectedClass + '-' + selectedSection}>
                      {selectedClass} - {selectedSection}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Resource Alerts */}
              <div>
                {resourceAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {resourceAlerts.map((alert, index) => (
                      <Alert key={index} variant={alert.type === 'error' ? 'destructive' : alert.type === 'info' ? 'default' : undefined}>
                        <AlertTitle className="flex items-center gap-2">
                          {alert.title}
                        </AlertTitle>
                        <AlertDescription>
                          {alert.description}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center p-6">
                    <div>
                      <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold">All Resources Ready</h3>
                      <p className="text-muted-foreground">
                        You have all resources needed to generate a timetable.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column - Stats */}
              <div className="space-y-4">
                {/* Allocation Stats */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Overall Allocation</h3>
                    <span className="text-sm">{getAllocationPercentage()}% Complete</span>
                  </div>
                  <Progress value={getAllocationPercentage()} />
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Required Classes:</span> 
                      <span className="font-medium">{getTotalRequiredClasses()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allocated Classes:</span> 
                      <span className="font-medium">{getTotalAllocatedClasses()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Subject Distribution Cards */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  <h3 className="font-semibold">Subject Allocation Status</h3>
                  {subjects.map(subject => {
                    const allocated = subjectDistribution[subject.name]?.assigned || 0;
                    const required = subject.classesPerWeek;
                    const percentage = required > 0 ? Math.round((allocated / required) * 100) : 0;
                    const teachersList = getTeachersForSubject(subject.name);
                    
                    // Determine status for styling
                    let statusColor = "bg-green-100 text-green-800";
                    if (isSubjectUnderAllocated(subject.name)) {
                      statusColor = "bg-amber-100 text-amber-800";
                    } else if (isSubjectOverAllocated(subject.name)) {
                      statusColor = "bg-red-100 text-red-800";
                    }
                    
                    return (
                      <div key={subject.id} className="border rounded-md p-3 flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{subject.name}</span>
                            <Badge variant={
                              subject.type === 'Main' ? 'default' : 
                              subject.type === 'Secondary' ? 'secondary' : 'outline'
                            }>
                              {subject.type}
                            </Badge>
                          </div>
                          <Badge className={statusColor}>
                            {allocated}/{required} Classes
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Teachers: </span>
                            <span className="font-medium">
                              {teachersList.length > 0 ? teachersList.join(', ') : 'None assigned'}
                            </span>
                          </div>
                        </div>
                        
                        <Progress value={percentage} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-center md:justify-between flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/timetable-wizard/school-timings')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to School Timings
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateTimetable}
                disabled={resourceAlerts.some(alert => alert.type === 'error')}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Generate Timetable
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Timetable */}
        {isGenerated && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Generated Class Timetable</CardTitle>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={handlePrintTimetable}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Print Timetable</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto" ref={printRef}>
                <Table className="border">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px] text-left">Period</TableHead>
                      <TableHead className="text-left">Time</TableHead>
                      {weekDays.map(day => (
                        <TableHead key={day} className="text-center">{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAllPeriods().map(period => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>
                          {period.startTime} - {period.endTime}
                        </TableCell>
                        
                        {weekDays.map(day => {
                          // For break or lunch periods
                          if (period.type !== 'Regular') {
                            return (
                              <TableCell key={day} colSpan={1} className="break-cell text-center">
                                {period.type}
                              </TableCell>
                            );
                          }
                          
                          // For regular periods
                          const slot = timetable[day]?.[period.id];
                          const subject = slot?.subject;
                          const teacher = slot?.teacher;
                          const borderClass = subject ? (
                            isSubjectOverAllocated(subject) ? "border-red-500" :
                            isSubjectUnderAllocated(subject) ? "border-yellow-500" : "border-green-500"
                          ) : "";
                          
                          const subjectInfo = subjects.find(s => s.name === subject);
                          const subjectTypeClass = subjectInfo?.type === 'Main' 
                            ? "bg-blue-50" 
                            : subjectInfo?.type === 'Secondary' 
                              ? "bg-purple-50" 
                              : "bg-gray-50";
                          
                          return (
                            <TableCell 
                              key={day} 
                              className={`text-center p-0 ${subject ? `${subjectTypeClass} ${borderClass} border-l-4` : ""}`}
                            >
                              <button
                                onClick={() => handleSlotClick(day, period.id)}
                                className="w-full h-full p-2"
                              >
                                {subject ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{subject}</span>
                                    {teacher && (
                                      <span className="text-xs text-gray-600">{teacher}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-50 border-l-4 border-green-500"></div>
                  <span className="text-sm">Main Subject</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-50 border-l-4 border-green-500"></div>
                  <span className="text-sm">Secondary Subject</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-50 border-l-4 border-green-500"></div>
                  <span className="text-sm">Elective Subject</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        )}
        
        {/* Teacher Management */}
        {isGenerated && teachers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Teacher Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teachers.map(teacher => (
                  <div 
                    key={teacher.id} 
                    className="border rounded-md p-4 hover:border-primary cursor-pointer transition-all"
                    onClick={() => handleEditTeacher(teacher)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{teacher.name}</h3>
                      <Badge variant="outline">
                        {teacherAssignments[teacher.name]?.assigned || 0}/{teacher.classesPerWeek} Classes
                      </Badge>
                    </div>
                    <Progress value={getTeacherWorkloadPercentage(teacher.name)} className="mb-2" />
                    <div className="text-sm text-muted-foreground">
                      <p>Subjects: {teacher.subjects.join(', ')}</p>
                      <div className="mt-1 grid grid-cols-3 gap-1">
                        {weekDays.map(day => (
                          <div key={day} className="text-xs">
                            <span className="font-medium">{day.substring(0, 3)}</span>: {teacherAssignments[teacher.name]?.dayLoad[day] || 0}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Slot Assignment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subject</DialogTitle>
              <DialogDescription>
                Select a subject to assign to this slot.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Clear Slot)</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.name}>
                        {subject.name} - {subject.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSubject && (
                <div className="grid gap-2">
                  <Label>Available Teachers</Label>
                  <div className="border rounded-md p-2 text-sm">
                    {getEligibleTeachers(selectedSubject).length > 0 ? (
                      getEligibleTeachers(selectedSubject).map(teacher => (
                        <div key={teacher.id} className="flex justify-between items-center py-1">
                          <span>{teacher.name}</span>
                          <Badge variant="outline">
                            {teacherAssignments[teacher.name]?.assigned || 0}/{teacher.classesPerWeek} Classes
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No teachers available for this subject</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignSlot}>Assign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Teacher Dialog */}
        <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Teacher</DialogTitle>
              <DialogDescription>
                Adjust teacher settings and workload.
              </DialogDescription>
            </DialogHeader>
            {selectedTeacher && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={selectedTeacher.name} disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subjects">Subjects</Label>
                  <Input 
                    id="subjects" 
                    value={selectedTeacher.subjects.join(', ')} 
                    disabled 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="classesPerWeek">Maximum Classes Per Week</Label>
                  <Input 
                    id="classesPerWeek" 
                    type="number"
                    min="1"
                    max="30"
                    value={editedClassesPerWeek}
                    onChange={(e) => setEditedClassesPerWeek(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTeacherDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTeacherEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

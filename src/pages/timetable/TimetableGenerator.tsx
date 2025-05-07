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

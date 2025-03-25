
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
import { ArrowRight, Plus, Trash2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
  classesPerWeek: number;
  availability: {
    [key: string]: { // day
      morning: boolean;
      afternoon: boolean;
    };
  };
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherAvailability() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teachers, setTeachers] = useState<Teacher[]>([
    { 
      id: '1', 
      name: 'Rajesh Kumar', 
      subjects: ['Mathematics', 'Physics'], 
      classesPerWeek: 20,
      availability: {
        Monday: { morning: true, afternoon: true },
        Tuesday: { morning: true, afternoon: true },
        Wednesday: { morning: true, afternoon: true },
        Thursday: { morning: true, afternoon: true },
        Friday: { morning: true, afternoon: true },
        Saturday: { morning: true, afternoon: false },
      }
    },
    { 
      id: '2', 
      name: 'Priya Sharma', 
      subjects: ['English', 'Social Studies'], 
      classesPerWeek: 22,
      availability: {
        Monday: { morning: true, afternoon: true },
        Tuesday: { morning: true, afternoon: true },
        Wednesday: { morning: true, afternoon: true },
        Thursday: { morning: true, afternoon: true },
        Friday: { morning: true, afternoon: true },
        Saturday: { morning: true, afternoon: false },
      }
    },
  ]);
  
  const [newTeacher, setNewTeacher] = useState<{
    name: string;
    subjects: string[];
    classesPerWeek: number;
    availability: {
      [key: string]: {
        morning: boolean;
        afternoon: boolean;
      };
    };
  }>({
    name: '',
    subjects: [],
    classesPerWeek: 20,
    availability: {
      Monday: { morning: true, afternoon: true },
      Tuesday: { morning: true, afternoon: true },
      Wednesday: { morning: true, afternoon: true },
      Thursday: { morning: true, afternoon: true },
      Friday: { morning: true, afternoon: true },
      Saturday: { morning: true, afternoon: false },
    }
  });
  
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [tempAvailability, setTempAvailability] = useState<any>(null);
  
  useEffect(() => {
    // Get subjects from session storage
    const storedSubjects = sessionStorage.getItem('subjects');
    
    if (storedSubjects) {
      const parsedSubjects = JSON.parse(storedSubjects);
      setSubjectsList(parsedSubjects.map((subject: any) => subject.name));
    } else {
      // If no subjects are selected, navigate back to subjects config
      navigate('/timetable-wizard/subjects');
    }
  }, [navigate]);
  
  const handleAddTeacher = () => {
    if (!newTeacher.name.trim() || newTeacher.subjects.length === 0) {
      toast({
        title: "Required Fields",
        description: "Teacher name and at least one subject are required",
        variant: "destructive",
      });
      return;
    }
    
    const newId = (teachers.length + 1).toString();
    setTeachers([...teachers, { id: newId, ...newTeacher }]);
    setNewTeacher({
      name: '',
      subjects: [],
      classesPerWeek: 20,
      availability: {
        Monday: { morning: true, afternoon: true },
        Tuesday: { morning: true, afternoon: true },
        Wednesday: { morning: true, afternoon: true },
        Thursday: { morning: true, afternoon: true },
        Friday: { morning: true, afternoon: true },
        Saturday: { morning: true, afternoon: false },
      }
    });
    setDialogOpen(false);
    
    toast({
      title: "Teacher Added",
      description: `${newTeacher.name} has been added to the teachers list.`,
    });
  };
  
  const handleDeleteTeacher = (id: string) => {
    setTeachers(teachers.filter(teacher => teacher.id !== id));
    toast({
      title: "Teacher Removed",
      description: "The teacher has been removed from the list.",
    });
  };
  
  const handleEditAvailability = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setSelectedTeacher(teacherId);
      setTempAvailability({ ...teacher.availability });
      setAvailabilityDialogOpen(true);
    }
  };
  
  const handleSaveAvailability = () => {
    if (selectedTeacher && tempAvailability) {
      setTeachers(
        teachers.map(teacher => 
          teacher.id === selectedTeacher 
            ? { ...teacher, availability: tempAvailability } 
            : teacher
        )
      );
      setAvailabilityDialogOpen(false);
      toast({
        title: "Availability Updated",
        description: "Teacher's availability has been updated successfully.",
      });
    }
  };
  
  const handleNext = () => {
    if (teachers.length === 0) {
      toast({
        title: "No Teachers",
        description: "Please add at least one teacher before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Store teachers in session storage for later steps
    sessionStorage.setItem('teachers', JSON.stringify(teachers));
    navigate('/timetable-wizard/school-timings');
  };
  
  return (
    <Layout 
      title="Teacher Availability" 
      subtitle="Step 3 of 5 - Configure teacher availability"
    >
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teachers List & Availability</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Teacher
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Teacher</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="teacherName" className="text-right text-sm font-medium">
                      Teacher Name
                    </label>
                    <Input
                      id="teacherName"
                      className="col-span-3"
                      placeholder="e.g., John Smith"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="subjects" className="text-right text-sm font-medium">
                      Subjects
                    </label>
                    <div className="col-span-3">
                      {subjectsList.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2 mb-2">
                          <Checkbox 
                            id={`subject-${subject}`} 
                            checked={newTeacher.subjects.includes(subject)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewTeacher({
                                  ...newTeacher,
                                  subjects: [...newTeacher.subjects, subject]
                                });
                              } else {
                                setNewTeacher({
                                  ...newTeacher,
                                  subjects: newTeacher.subjects.filter(s => s !== subject)
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`subject-${subject}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {subject}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="classesPerWeek" className="text-right text-sm font-medium">
                      Max Classes/Week
                    </label>
                    <Input
                      id="classesPerWeek"
                      className="col-span-3"
                      type="number"
                      min="1"
                      max="40"
                      value={newTeacher.classesPerWeek}
                      onChange={(e) => setNewTeacher({ 
                        ...newTeacher, 
                        classesPerWeek: parseInt(e.target.value) || 20 
                      })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTeacher}>Add Teacher</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead className="text-center">Max Classes/Week</TableHead>
                  <TableHead className="text-center">Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No teachers added. Click "Add Teacher" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map(subject => (
                            <span 
                              key={subject} 
                              className="px-2 py-1 bg-secondary rounded-full text-xs"
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
                          onClick={() => handleEditAvailability(teacher.id)}
                        >
                          Edit Availability
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteTeacher(teacher.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/timetable-wizard/subjects')}>
              Back
            </Button>
            <Button onClick={handleNext}>
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Availability Dialog */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Edit Availability
              {selectedTeacher && (
                <span className="ml-2 font-normal text-sm">
                  ({teachers.find(t => t.id === selectedTeacher)?.name})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {tempAvailability && (
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-center">Morning (8:45 - 12:30)</TableHead>
                    <TableHead className="text-center">Afternoon (1:15 - 5:00)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekDays.map((day) => (
                    <TableRow key={day}>
                      <TableCell className="font-medium">{day}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={tempAvailability[day]?.morning}
                            onCheckedChange={(checked) => {
                              setTempAvailability({
                                ...tempAvailability,
                                [day]: {
                                  ...tempAvailability[day],
                                  morning: checked
                                }
                              });
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={tempAvailability[day]?.afternoon}
                            onCheckedChange={(checked) => {
                              setTempAvailability({
                                ...tempAvailability,
                                [day]: {
                                  ...tempAvailability[day],
                                  afternoon: checked
                                }
                              });
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvailabilityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAvailability}>Save Availability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}


import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Subject = {
  id: string;
  name: string;
  type: 'Main' | 'Secondary' | 'Elective';
  classesPerWeek: number;
};

export default function SubjectsConfig() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: 'Mathematics', type: 'Main', classesPerWeek: 6 },
    { id: '2', name: 'English', type: 'Main', classesPerWeek: 5 },
    { id: '3', name: 'Science', type: 'Main', classesPerWeek: 4 },
    { id: '4', name: 'Social Studies', type: 'Main', classesPerWeek: 4 },
    { id: '5', name: 'Physical Education', type: 'Secondary', classesPerWeek: 2 },
    { id: '6', name: 'Computer Science', type: 'Secondary', classesPerWeek: 2 },
  ]);
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [newSubject, setNewSubject] = useState<{
    name: string;
    type: 'Main' | 'Secondary' | 'Elective';
    classesPerWeek: number;
  }>({
    name: '',
    type: 'Secondary',
    classesPerWeek: 2,
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  
  useEffect(() => {
    // Get class and section from session storage
    const storedClass = sessionStorage.getItem('selectedClass');
    const storedSection = sessionStorage.getItem('selectedSection');
    
    if (storedClass && storedSection) {
      setSelectedClass(storedClass);
      setSelectedSection(storedSection);
    } else {
      // If no class and section are selected, navigate back to class selection
      navigate('/timetable-wizard/class-selection');
    }
  }, [navigate]);
  
  const handleAddSubject = () => {
    if (!newSubject.name.trim()) {
      toast({
        title: "Required Field",
        description: "Subject name is required",
        variant: "destructive",
      });
      return;
    }
    
    const newId = (subjects.length + 1).toString();
    setSubjects([...subjects, { id: newId, ...newSubject }]);
    setNewSubject({
      name: '',
      type: 'Secondary',
      classesPerWeek: 2,
    });
    setDialogOpen(false);
    
    toast({
      title: "Subject Added",
      description: `${newSubject.name} has been added to the subject list.`,
    });
  };
  
  const handleDeleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
    toast({
      title: "Subject Removed",
      description: "The subject has been removed from the list.",
    });
  };
  
  const handleNext = () => {
    if (subjects.length === 0) {
      toast({
        title: "No Subjects",
        description: "Please add at least one subject before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Store subjects in session storage for later steps
    sessionStorage.setItem('subjects', JSON.stringify(subjects));
    navigate('/timetable-wizard/teachers');
  };
  
  return (
    <Layout 
      title="Subjects Configuration" 
      subtitle="Step 2 of 5 - Configure subjects and courses"
    >
      <div className="max-w-4xl mx-auto">
        <Card className="w-full mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {selectedClass ? `${selectedClass} - Section ${selectedSection}` : 'Loading...'}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subjects and Courses</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="subjectName" className="text-right text-sm font-medium">
                      Subject Name
                    </label>
                    <Input
                      id="subjectName"
                      className="col-span-3"
                      placeholder="e.g., Mathematics"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="subjectType" className="text-right text-sm font-medium">
                      Type
                    </label>
                    <Select 
                      value={newSubject.type} 
                      onValueChange={(value: 'Main' | 'Secondary' | 'Elective') => 
                        setNewSubject({ ...newSubject, type: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main">Main</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="classesPerWeek" className="text-right text-sm font-medium">
                      Classes Per Week
                    </label>
                    <Input
                      id="classesPerWeek"
                      className="col-span-3"
                      type="number"
                      min="1"
                      max="10"
                      value={newSubject.classesPerWeek}
                      onChange={(e) => setNewSubject({ 
                        ...newSubject, 
                        classesPerWeek: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSubject}>Add Subject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Classes Per Week</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No subjects added. Click "Add Subject" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        <div className={`px-2 py-1 rounded-full text-xs inline-block
                          ${subject.type === 'Main' ? 'bg-blue-100 text-blue-800' : 
                            subject.type === 'Secondary' ? 'bg-green-100 text-green-800' : 
                            'bg-purple-100 text-purple-800'}`}>
                          {subject.type}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{subject.classesPerWeek}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteSubject(subject.id)}
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
            <Button variant="outline" onClick={() => navigate('/timetable-wizard/class-selection')}>
              Back
            </Button>
            <Button onClick={handleNext}>
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}

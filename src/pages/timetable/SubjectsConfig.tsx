
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
import { ArrowRight, Edit, Plus, Printer, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type Subject = {
  id: string;
  name: string;
  type: 'Main' | 'Secondary' | 'Elective';
  classesPerWeek: number;
  daysPerWeek: number;
};

export default function SubjectsConfig() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: 'Mathematics', type: 'Main', classesPerWeek: 6, daysPerWeek: 5 },
    { id: '2', name: 'English', type: 'Main', classesPerWeek: 5, daysPerWeek: 5 },
    { id: '3', name: 'Science', type: 'Main', classesPerWeek: 4, daysPerWeek: 4 },
    { id: '4', name: 'Social Studies', type: 'Main', classesPerWeek: 4, daysPerWeek: 4 },
    { id: '5', name: 'Physical Education', type: 'Secondary', classesPerWeek: 2, daysPerWeek: 2 },
    { id: '6', name: 'Computer Science', type: 'Secondary', classesPerWeek: 2, daysPerWeek: 2 },
  ]);
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [newSubject, setNewSubject] = useState<{
    name: string;
    type: 'Main' | 'Secondary' | 'Elective';
    classesPerWeek: number;
    daysPerWeek: number;
  }>({
    name: '',
    type: 'Secondary',
    classesPerWeek: 2,
    daysPerWeek: 2,
  });
  
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
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
      daysPerWeek: 2,
    });
    setAddDialogOpen(false);
    
    toast({
      title: "Subject Added",
      description: `${newSubject.name} has been added to the subject list.`,
    });
  };
  
  const handleEditSubject = () => {
    if (!editSubject) return;
    
    if (!editSubject.name.trim()) {
      toast({
        title: "Required Field",
        description: "Subject name is required",
        variant: "destructive",
      });
      return;
    }
    
    setSubjects(subjects.map(subject => 
      subject.id === editSubject.id ? editSubject : subject
    ));
    
    setEditDialogOpen(false);
    setEditSubject(null);
    
    toast({
      title: "Subject Updated",
      description: `${editSubject.name} has been updated.`,
    });
  };
  
  const handleDeleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
    toast({
      title: "Subject Removed",
      description: "The subject has been removed from the list.",
    });
  };
  
  const handleOpenEditDialog = (subject: Subject) => {
    setEditSubject({...subject});
    setEditDialogOpen(true);
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
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="daysPerWeek" className="text-right text-sm font-medium">
                      Days Per Week
                    </label>
                    <Input
                      id="daysPerWeek"
                      className="col-span-3"
                      type="number"
                      min="1"
                      max="6"
                      value={newSubject.daysPerWeek}
                      onChange={(e) => setNewSubject({ 
                        ...newSubject, 
                        daysPerWeek: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
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
                  <TableHead className="text-center">Days Per Week</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
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
                      <TableCell className="text-center">{subject.daysPerWeek}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenEditDialog(subject)}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
      
      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="editSubjectName" className="text-right text-sm font-medium">
                Subject Name
              </label>
              <Input
                id="editSubjectName"
                className="col-span-3"
                value={editSubject?.name || ''}
                onChange={(e) => setEditSubject(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="editSubjectType" className="text-right text-sm font-medium">
                Type
              </label>
              <Select 
                value={editSubject?.type} 
                onValueChange={(value: 'Main' | 'Secondary' | 'Elective') => 
                  setEditSubject(prev => prev ? { ...prev, type: value } : null)
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
              <label htmlFor="editClassesPerWeek" className="text-right text-sm font-medium">
                Classes Per Week
              </label>
              <Input
                id="editClassesPerWeek"
                className="col-span-3"
                type="number"
                min="1"
                max="10"
                value={editSubject?.classesPerWeek || 1}
                onChange={(e) => setEditSubject(prev => 
                  prev ? { ...prev, classesPerWeek: parseInt(e.target.value) || 1 } : null
                )}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="editDaysPerWeek" className="text-right text-sm font-medium">
                Days Per Week
              </label>
              <Input
                id="editDaysPerWeek"
                className="col-span-3"
                type="number"
                min="1"
                max="6"
                value={editSubject?.daysPerWeek || 1}
                onChange={(e) => setEditSubject(prev => 
                  prev ? { ...prev, daysPerWeek: parseInt(e.target.value) || 1 } : null
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubject}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

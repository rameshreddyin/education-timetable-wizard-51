
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
import { ArrowRight, Clock, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Period = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'Regular' | 'Break' | 'Lunch';
};

export default function SchoolTimings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [periods, setPeriods] = useState<Period[]>([
    { id: '1', name: 'Period 1', startTime: '08:45', endTime: '09:35', type: 'Regular' },
    { id: '2', name: 'Period 2', startTime: '09:35', endTime: '10:25', type: 'Regular' },
    { id: 'b1', name: 'Short Break', startTime: '10:25', endTime: '10:40', type: 'Break' },
    { id: '3', name: 'Period 3', startTime: '10:40', endTime: '11:30', type: 'Regular' },
    { id: '4', name: 'Period 4', startTime: '11:30', endTime: '12:20', type: 'Regular' },
    { id: 'l1', name: 'Lunch Break', startTime: '12:20', endTime: '13:15', type: 'Lunch' },
    { id: '5', name: 'Period 5', startTime: '13:15', endTime: '14:05', type: 'Regular' },
    { id: '6', name: 'Period 6', startTime: '14:05', endTime: '14:55', type: 'Regular' },
    { id: 'b2', name: 'Short Break', startTime: '14:55', endTime: '15:10', type: 'Break' },
    { id: '7', name: 'Period 7', startTime: '15:10', endTime: '16:00', type: 'Regular' },
    { id: '8', name: 'Period 8', startTime: '16:00', endTime: '17:00', type: 'Regular' },
  ]);
  
  const [editMode, setEditMode] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Omit<Period, 'id'>>({
    name: '',
    startTime: '',
    endTime: '',
    type: 'Regular',
  });
  
  const handleAddPeriod = () => {
    // Validate inputs
    if (!newPeriod.name || !newPeriod.startTime || !newPeriod.endTime) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields for the new period.",
        variant: "destructive",
      });
      return;
    }
    
    // Generate a unique ID
    const newId = `p${Date.now().toString().slice(-4)}`;
    
    // Add the new period
    setPeriods([...periods, { ...newPeriod, id: newId }]);
    
    // Reset the form
    setNewPeriod({
      name: '',
      startTime: '',
      endTime: '',
      type: 'Regular',
    });
    
    toast({
      title: "Period Added",
      description: `${newPeriod.name} has been added to the schedule.`,
    });
  };
  
  const handleDeletePeriod = (id: string) => {
    setPeriods(periods.filter(period => period.id !== id));
    toast({
      title: "Period Removed",
      description: "The period has been removed from the schedule.",
    });
  };
  
  const handleUpdatePeriod = (id: string, field: keyof Period, value: string) => {
    setPeriods(periods.map(period => 
      period.id === id ? { ...period, [field]: value } : period
    ));
  };
  
  const handleSaveChanges = () => {
    // Sort periods by start time
    const sortedPeriods = [...periods].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
    
    setPeriods(sortedPeriods);
    setEditMode(false);
    
    toast({
      title: "Changes Saved",
      description: "School timings have been updated successfully.",
    });
  };
  
  const handleNext = () => {
    if (periods.filter(p => p.type === 'Regular').length < 3) {
      toast({
        title: "Insufficient Periods",
        description: "Please add at least 3 regular periods to continue.",
        variant: "destructive",
      });
      return;
    }
    
    // Store periods in session storage for later steps
    sessionStorage.setItem('periods', JSON.stringify(periods));
    navigate('/timetable-wizard/generator');
  };
  
  return (
    <Layout 
      title="School Timings" 
      subtitle="Step 4 of 5 - Configure school timings and periods"
    >
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>School Timings & Periods</CardTitle>
            <div className="flex gap-2">
              {editMode ? (
                <Button onClick={handleSaveChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Edit Timings
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Type</TableHead>
                  {editMode && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      {editMode ? (
                        <Input
                          value={period.name}
                          onChange={(e) => handleUpdatePeriod(period.id, 'name', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        <div className={`font-medium ${period.type !== 'Regular' ? 'text-muted-foreground' : ''}`}>
                          {period.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <Input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => handleUpdatePeriod(period.id, 'startTime', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        formatTime(period.startTime)
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <Input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => handleUpdatePeriod(period.id, 'endTime', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        formatTime(period.endTime)
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <Select 
                          value={period.type} 
                          onValueChange={(value: 'Regular' | 'Break' | 'Lunch') => 
                            handleUpdatePeriod(period.id, 'type', value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Break">Break</SelectItem>
                            <SelectItem value="Lunch">Lunch</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div 
                          className={`px-2 py-1 rounded-full text-xs inline-block
                            ${period.type === 'Regular' ? 'bg-blue-100 text-blue-800' : 
                              period.type === 'Break' ? 'bg-amber-100 text-amber-800' : 
                              'bg-green-100 text-green-800'}`}
                        >
                          {period.type}
                        </div>
                      )}
                    </TableCell>
                    {editMode && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeletePeriod(period.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                
                {editMode && (
                  <TableRow>
                    <TableCell>
                      <Input
                        placeholder="New Period Name"
                        value={newPeriod.name}
                        onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        placeholder="Start Time"
                        value={newPeriod.startTime}
                        onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        placeholder="End Time"
                        value={newPeriod.endTime}
                        onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={newPeriod.type} 
                        onValueChange={(value: 'Regular' | 'Break' | 'Lunch') => 
                          setNewPeriod({ ...newPeriod, type: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Break">Break</SelectItem>
                          <SelectItem value="Lunch">Lunch</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleAddPeriod}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/timetable-wizard/teachers')}>
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

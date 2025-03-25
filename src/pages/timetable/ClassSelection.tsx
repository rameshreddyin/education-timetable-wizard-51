
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function ClassSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const classList = [
    'Class 1 - Primary',
    'Class 2 - Primary',
    'Class 3 - Primary',
    'Class 4 - Primary',
    'Class 5 - Upper Primary',
    'Class 6 - Upper Primary',
    'Class 7 - Middle School',
    'Class 8 - Middle School',
    'Class 9 - Secondary',
    'Class 10 - Secondary',
    'Class 11 - Senior Secondary',
    'Class 12 - Senior Secondary',
  ];
  
  const sectionList = ['A', 'B', 'C', 'D'];
  
  const handleNext = () => {
    if (!selectedClass || !selectedSection) {
      toast({
        title: "Selection required",
        description: "Please select both class and section to continue.",
        variant: "destructive",
      });
      return;
    }
    
    // Store selection in session storage for later steps
    sessionStorage.setItem('selectedClass', selectedClass);
    sessionStorage.setItem('selectedSection', selectedSection);
    
    navigate('/timetable-wizard/subjects');
  };
  
  return (
    <Layout title="Class Selection" subtitle="Step 1 of 5 - Select class and section">
      <div className="max-w-2xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Select Class and Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionList.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">Selected:</p>
              <div className="p-4 bg-secondary rounded-md">
                {selectedClass && selectedSection ? (
                  <p className="font-medium">
                    {selectedClass} - Section {selectedSection}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No selection made</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/timetable-wizard')}>
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

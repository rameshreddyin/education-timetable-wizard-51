
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CalendarClock, Layers, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    id: 'class-selection',
    title: 'Class Selection',
    description: 'Select class and section',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: 'subjects',
    title: 'Subjects & Courses',
    description: 'Configure subjects and courses',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: 'teachers',
    title: 'Teacher Availability',
    description: 'Configure teacher availability',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'school-timings',
    title: 'School Timings',
    description: 'Configure school timings & periods',
    icon: <CalendarClock className="w-5 h-5" />,
  },
  {
    id: 'generator',
    title: 'Timetable Generator',
    description: 'Create and review timetable',
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

export default function TimetableWizard() {
  const navigate = useNavigate();
  
  return (
    <Layout 
      title="Timetable Wizard" 
      subtitle="Create timetables for classes automatically"
    >
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Welcome to the Timetable Wizard</CardTitle>
          <CardDescription>
            Let's create a timetable for your class. Follow the steps to configure the timetable settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                  {step.icon}
                </div>
                <h3 className="font-medium text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 mt-2 text-muted-foreground rotate-90 md:rotate-0 md:mt-0 md:hidden md:transform-none" />
                )}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Create a comprehensive and balanced timetable for your school classes with our intuitive wizard. 
                Configure subjects, teacher availability, and school timings to generate optimal timetables automatically.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/timetable-wizard/class-selection')}
                className="animate-pulse hover:animate-none"
              >
                Start Timetable Wizard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}

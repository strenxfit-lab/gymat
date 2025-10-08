
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Building, User, Ruler, Dumbbell, Wallet, BarChart, Calendar, Clock, MapPin, Phone, Mail, Users, Briefcase, Plus, Trash } from 'lucide-react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  price: z.string().min(1, 'Price is required'),
});

const formSchema = z.object({
  gymName: z.string().min(1, 'Gym Name is required.'),
  gymAddress: z.string().optional(),
  cityStatePin: z.string().optional(),
  contactNumber: z.string().length(10, { message: "Contact number must be 10 digits." }),
  gymEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  gymStartDate: z.string().optional(),
  
  ownerName: z.string().optional(),
  ownerMobile: z.string().optional(),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerAlternateContact: z.string().optional(),
  gymArea: z.string().optional(),
  maxCapacity: z.string().optional(),
  numTrainers: z.string().optional(),
  numStaff: z.string().optional(),
  openDays: z.array(z.string()).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  hasPlans: z.string().optional(),
  plans: z.array(planSchema).optional(),
  monthlyFee: z.string().optional(),
  suggestedPlans: z.array(planSchema).optional(),
  freeTrial: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  numMachines: z.string().optional(),
  keyBrands: z.string().optional(),
  primaryGoal: z.string().optional(),
  expectedMembers: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type FieldName = keyof FormData;


const steps: { id: number; title: string; icon: JSX.Element, fields: FieldName[] }[] = [
  { id: 1, title: "Basic Gym Information", icon: <Building className="h-6 w-6" />, fields: ['gymName', 'gymAddress', 'cityStatePin', 'contactNumber', 'gymEmail', 'gymStartDate'] },
  { id: 2, title: "Owner Information", icon: <User className="h-6 w-6" />, fields: ['ownerName', 'ownerMobile', 'ownerEmail', 'ownerAlternateContact'] },
  { id: 3, title: "Gym Capacity & Setup", icon: <Ruler className="h-6 w-6" />, fields: ['gymArea', 'maxCapacity', 'numTrainers', 'numStaff', 'openDays', 'openingTime', 'closingTime'] },
  { id: 4, title: "Membership & Plans", icon: <Wallet className="h-6 w-6" />, fields: ['hasPlans', 'plans', 'freeTrial', 'monthlyFee'] },
  { id: 5, title: "Facilities & Machines", icon: <Dumbbell className="h-6 w-6" />, fields: ['facilities', 'numMachines', 'keyBrands'] },
  { id: 6, title: "Goals & Insights", icon: <BarChart className="h-6 w-6" />, fields: ['primaryGoal', 'expectedMembers'] },
];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const facilitiesList = ["Cardio", "Strength", "CrossFit", "Zumba", "Steam", "Shower", "Locker"];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gymName: '',
      gymAddress: '',
      cityStatePin: '',
      contactNumber: '',
      gymEmail: '',
      gymStartDate: '',
      ownerName: '',
      ownerMobile: '',
      ownerEmail: '',
      ownerAlternateContact: '',
      gymArea: '',
      maxCapacity: '',
      numTrainers: '',
      numStaff: '',
      openingTime: '',
      closingTime: '',
      hasPlans: '',
      freeTrial: '',
      monthlyFee: '',
      numMachines: '',
      keyBrands: '',
      primaryGoal: '',
      expectedMembers: '',
      openDays: [],
      plans: [{ name: '', price: '' }],
      facilities: [],
    },
  });
  
  const { fields: planFields, append: appendPlan, remove: removePlan } = useFieldArray({
    control: form.control,
    name: "plans"
  });

  useEffect(() => {
    const docId = localStorage.getItem('userDocId');
    if (!docId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
    } else {
      setUserDocId(docId);
    }
  }, [router, toast]);

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep - 1].fields;
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };
  const handleSkip = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  
  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      // Save all details to a subcollection
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data);
      
      const userRef = doc(db, 'gyms', userDocId);
      
      // Update main doc with essential info for quick access
      await updateDoc(userRef, { 
        onboardingComplete: true,
        name: data.gymName,
        location: data.gymAddress,
        multiBranch: false,
       });

      toast({
        title: 'Setup Complete!',
        description: 'Your gym details have been saved successfully.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast({
        title: 'Error',
        description: 'Could not save your details. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Progress value={progress} className="mb-4" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {steps[currentStep - 1].icon}
            </div>
            <div>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>Step {currentStep} of {steps.length}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="min-h-[350px] space-y-6">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="gymName" render={({ field }) => ( <FormItem><FormLabel>Gym Name</FormLabel><FormControl><Input placeholder="Strenxfit Gym" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="gymAddress" render={({ field }) => ( <FormItem><FormLabel>Gym Address</FormLabel><FormControl><Input placeholder="123 Fitness Ave" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="cityStatePin" render={({ field }) => ( <FormItem><FormLabel>City, State, PIN</FormLabel><FormControl><Input placeholder="Metropolis, NY, 10001" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="contactNumber" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="gymEmail" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="contact@strenxfit.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="gymStartDate" render={({ field }) => ( <FormItem><FormLabel>Gym Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
              )}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="ownerName" render={({ field }) => ( <FormItem><FormLabel>Owner Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl></FormItem> )} />
                  <FormField control={form.control} name="ownerMobile" render={({ field }) => ( <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="+1 987 654 321" {...field} /></FormControl></FormItem> )} />
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl></FormItem> )} />
                  <FormField control={form.control} name="ownerAlternateContact" render={({ field }) => ( <FormItem><FormLabel>Alternate Contact (Optional)</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl></FormItem> )} />
                </div>
              )}
               {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="gymArea" render={({ field }) => ( <FormItem><FormLabel>Total Gym Area (sq. ft.)</FormLabel><FormControl><Input placeholder="5000" {...field} /></FormControl></FormItem> )} />
                     <FormField control={form.control} name="maxCapacity" render={({ field }) => ( <FormItem><FormLabel>Max Member Capacity</FormLabel><FormControl><Input placeholder="200" {...field} /></FormControl></FormItem> )} />
                     <FormField control={form.control} name="numTrainers" render={({ field }) => ( <FormItem><FormLabel>Number of Trainers</FormLabel><FormControl><Input placeholder="10" {...field} /></FormControl></FormItem> )} />
                     <FormField control={form.control} name="numStaff" render={({ field }) => ( <FormItem><FormLabel>Number of Staff</FormLabel><FormControl><Input placeholder="5" {...field} /></FormControl></FormItem> )} />
                  </div>
                  <FormField control={form.control} name="openDays" render={() => (
                      <FormItem>
                        <FormLabel>Open Days</FormLabel>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {daysOfWeek.map((day) => (
                            <FormField key={day} control={form.control} name="openDays" render={({ field }) => (
                                <FormItem key={day} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {
                                      return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day));
                                    }} /></FormControl>
                                  <FormLabel className="font-normal">{day}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="openingTime" render={({ field }) => ( <FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> )} />
                     <FormField control={form.control} name="closingTime" render={({ field }) => ( <FormItem><FormLabel>Closing Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> )} />
                  </div>
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-4">
                    <FormField control={form.control} name="hasPlans" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Do you already have membership plans?</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )} />

                    {form.watch('hasPlans') === 'yes' && (
                        <div>
                            <FormLabel>Enter Plans</FormLabel>
                            {planFields.map((item, index) => (
                                <div key={item.id} className="flex gap-2 mb-2 items-center">
                                    <FormField control={form.control} name={`plans.${index}.name`} render={({ field }) => ( <FormItem className="flex-grow"><FormControl><Input placeholder="e.g., Monthly" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`plans.${index}.price`} render={({ field }) => ( <FormItem className="w-24"><FormControl><Input placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePlan(index)}><Trash className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendPlan({name: '', price: ''})}><Plus className="mr-2 h-4 w-4"/>Add Plan</Button>
                        </div>
                    )}

                    {form.watch('hasPlans') === 'no' && (
                       <div className="space-y-4">
                         <FormField control={form.control} name="monthlyFee" render={({ field }) => ( <FormItem><FormLabel>What is your monthly fee?</FormLabel><FormControl><Input placeholder="1500" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         {form.watch('monthlyFee') && (
                            <Card className="bg-muted/50">
                               <CardHeader><CardTitle className="text-base">Suggested Plans</CardTitle></CardHeader>
                               <CardContent className="space-y-2">
                                 <p><strong>Monthly:</strong> ₹{form.getValues('monthlyFee')}</p>
                                 <p><strong>Quarterly:</strong> ₹{Number(form.getValues('monthlyFee'))*3}</p>
                                 <p><strong>Yearly:</strong> ₹{Number(form.getValues('monthlyFee'))*12}</p>
                               </CardContent>
                               <CardFooter className="flex gap-2">
                                 <Button type="button" size="sm">Confirm</Button>
                                 <Button type="button" variant="outline" size="sm">Edit</Button>
                                 <Button type="button" variant="ghost" size="sm">Cancel</Button>
                               </CardFooter>
                            </Card>
                         )}
                       </div>
                    )}

                     <FormField control={form.control} name="freeTrial" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Offer a Free Trial Option?</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )} />
                </div>
              )}
               {currentStep === 5 && (
                <div className="space-y-4">
                    <FormField control={form.control} name="facilities" render={() => (
                      <FormItem>
                        <FormLabel>Facilities Provided</FormLabel>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {facilitiesList.map((item) => (
                            <FormField key={item} control={form.control} name="facilities" render={({ field }) => (
                              <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                  return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item));
                                }} /></FormControl>
                                <FormLabel className="font-normal">{item}</FormLabel>
                              </FormItem>
                            )}/>
                          ))}
                        </div>
                      </FormItem>
                    )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="numMachines" render={({ field }) => ( <FormItem><FormLabel>Number of Machines (approx.)</FormLabel><FormControl><Input placeholder="50" {...field} /></FormControl></FormItem> )} />
                         <FormField control={form.control} name="keyBrands" render={({ field }) => ( <FormItem><FormLabel>Key Equipment Brands (Optional)</FormLabel><FormControl><Input placeholder="StrenxFit" {...field} /></FormControl></FormItem> )} />
                    </div>
                </div>
              )}
              {currentStep === 6 && (
                 <div className="space-y-4">
                     <FormField control={form.control} name="primaryGoal" render={({ field }) => (
                        <FormItem><FormLabel>What is your Gym’s Primary Goal?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="increase-members">Increase Members</SelectItem>
                              <SelectItem value="manage-trainers">Manage Trainers</SelectItem>
                              <SelectItem value="track-payments">Track Payments</SelectItem>
                              <SelectItem value="reports-analytics">Reports & Analytics</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                     )} />
                     <FormField control={form.control} name="expectedMembers" render={({ field }) => ( <FormItem><FormLabel>How many members do you expect in next 3 months?</FormLabel><FormControl><Input placeholder="50" {...field} /></FormControl></FormItem> )} />
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {currentStep > 1 && <Button type="button" variant="outline" onClick={handleBack}>Back</Button>}
              <div className="flex-grow"></div>
              {currentStep > 1 && currentStep < steps.length && <Button type="button" variant="ghost" onClick={handleSkip}>Skip</Button>}
              {currentStep < steps.length && <Button type="button" onClick={handleNext}>Next</Button>}
              {currentStep === steps.length && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Submit & Finish'}
                </Button>
              )}
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}

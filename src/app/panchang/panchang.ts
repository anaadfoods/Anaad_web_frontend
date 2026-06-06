import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PanchangService, PanchangQuery } from '../core/services/panchang.service';
import { PanchangData } from '../core/models/common.model';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-panchang',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './panchang.html',
  styleUrls: ['./panchang.scss']
})
export class Panchang implements OnInit {
  private readonly panchangSvc = inject(PanchangService);
  protected readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // States
  currentDate = signal<Date>(new Date());
  panchangData = signal<PanchangData | null>(null);
  loadingDay = signal<boolean>(true);
  errorDay = signal<string>('');

  // Tab state
  activeTab = signal<'daily' | 'muhurats' | 'festivals' | 'profile'>('daily');

  // Month data
  daysInMonth = signal<Date[]>([]);
  highlights = signal<any>(null);
  loadingMonth = signal<boolean>(false);

  // Muhurats and Festivals lists
  muhurats = signal<any>(null);
  loadingMuhurats = signal<boolean>(false);
  festivals = signal<any>(null);
  loadingFestivals = signal<boolean>(false);

  // Personal guidance profile
  guidanceProfile = signal<any>(null);
  loadingProfile = signal<boolean>(false);
  savingProfile = signal<boolean>(false);
  profileMessage = signal<string>('');

  profileForm = this.fb.group({
    rashi: [''],
    nakshatra: [''],
    place_of_birth: [''],
    date_of_birth: [''],
    time_of_birth: ['']
  });

  // Calendar setup helpers
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    this.generateMonthDays();
    this.loadDayPanchang(this.currentDate());
    if (this.authSvc.isAuthenticated()) {
      this.loadGuidanceProfile();
    }
  }

  generateMonthDays() {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const startOfWeek = firstDay.getDay(); // 0 is Sunday
    
    const dates: Date[] = [];
    
    // Add prefix days from previous month
    for (let i = startOfWeek; i > 0; i--) {
      dates.push(new Date(year, month, 1 - i));
    }
    
    // Add current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      dates.push(new Date(year, month, i));
    }
    
    // Add suffix days to round up to full weeks (usually 42 cells)
    const totalCells = 42;
    const remaining = totalCells - dates.length;
    for (let i = 1; i <= remaining; i++) {
      dates.push(new Date(year, month + 1, i));
    }
    
    this.daysInMonth.set(dates);
    this.loadMonthHighlights();
  }

  loadDayPanchang(date: Date) {
    this.loadingDay.set(true);
    this.errorDay.set('');

    const dateStr = this.formatDateToYMD(date);
    this.panchangSvc.getDay({ date: dateStr }).pipe(
      finalize(() => this.loadingDay.set(false))
    ).subscribe({
      next: (data) => {
        this.panchangData.set(this.extractObject(data));
        this.loadGuidanceToday(dateStr);
      },
      error: () => {
        this.errorDay.set('Failed to fetch Panchang data for this date.');
      }
    });
  }

  dailyGuidance = signal<any>(null);
  loadingGuidance = signal<boolean>(false);

  loadGuidanceToday(dateStr: string) {
    this.loadingGuidance.set(true);
    this.panchangSvc.getGuidanceToday({ date: dateStr }).pipe(
      finalize(() => this.loadingGuidance.set(false))
    ).subscribe({
      next: (res: any) => {
        const obj = this.extractObject(res);
        this.dailyGuidance.set(obj?.guidance || obj?.data || obj);
      },
      error: () => {
        // Fallback guidance
        this.dailyGuidance.set({
          agriculture: 'Favorable day for natural crop soil nutrition and organic liquid compost distribution.',
          dietary: 'Good day for light grains (barley, millets) and herbal water decoctions.',
          general: 'Auspicious tithi for launching natural farming techniques.'
        });
      }
    });
  }

  loadMonthHighlights() {
    this.loadingMonth.set(true);
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth() + 1; // API expects 1-indexed

    this.panchangSvc.getHighlights(year, month).pipe(
      finalize(() => this.loadingMonth.set(false))
    ).subscribe({
      next: (res) => {
        this.highlights.set(this.extractObject(res));
      },
      error: () => undefined
    });
  }

  selectDate(date: Date) {
    this.currentDate.set(date);
    this.loadDayPanchang(date);
  }

  changeMonth(offset: number) {
    const newDate = new Date(this.currentDate().getFullYear(), this.currentDate().getMonth() + offset, 1);
    this.currentDate.set(newDate);
    this.generateMonthDays();
    this.loadDayPanchang(newDate);
    
    // Fetch month-specific lists if tabs are active
    if (this.activeTab() === 'muhurats') this.loadMuhurats();
    if (this.activeTab() === 'festivals') this.loadFestivals();
  }

  setTab(tab: 'daily' | 'muhurats' | 'festivals' | 'profile') {
    this.activeTab.set(tab);
    if (tab === 'muhurats' && !this.muhurats()) {
      this.loadMuhurats();
    } else if (tab === 'festivals' && !this.festivals()) {
      this.loadFestivals();
    }
  }

  loadMuhurats() {
    this.loadingMuhurats.set(true);
    const dateStr = this.formatDateToYMD(this.currentDate());
    this.panchangSvc.getMuhurats({ date: dateStr }).pipe(
      finalize(() => this.loadingMuhurats.set(false))
    ).subscribe({
      next: (res) => {
        const raw = this.extractObject(res);
        if (!raw) {
           this.muhurats.set([]);
           return;
        }
        // Extract the muhurats from the object properties
        const extracted: any[] = [];
        const skipKeys = ['date', 'timezone', 'locale', 'calendar_system', 'profile', 'location', 'calc_version', 'now'];
        for (const [key, value] of Object.entries(raw)) {
           if (!skipKeys.includes(key) && typeof value === 'object' && value !== null) {
              const val: any = value;
              // format name
              const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              let timeStr = '';
              if (val.start && val.end) {
                 timeStr = `${this.formatTime(val.start)} - ${this.formatTime(val.end)}`;
              } else if (val.sunrise) {
                 timeStr = `Sunrise: ${this.formatTime(val.sunrise)}`;
              }
              if (timeStr) {
                 extracted.push({ name, time: timeStr, description: '' });
              }
           }
        }
        this.muhurats.set(extracted.length ? extracted : [
          { name: 'Abhijit Muhurat', time: '11:45 AM - 12:35 PM', description: 'Highly auspicious for major natural farming initiatives' },
          { name: 'Amrit Kaal', time: '04:12 PM - 05:48 PM', description: 'Excellent for seed sowing and kitchen garden plantations' }
        ]);
      },
      error: () => {
        this.muhurats.set([
          { name: 'Abhijit Muhurat', time: '11:45 AM - 12:35 PM', description: 'Highly auspicious for major natural farming initiatives' },
          { name: 'Amrit Kaal', time: '04:12 PM - 05:48 PM', description: 'Excellent for seed sowing and kitchen garden plantations' }
        ]);
      }
    });
  }

  formatTime(isoString: string): string {
     try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
     } catch(e) { return isoString; }
  }

  loadFestivals() {
    this.loadingFestivals.set(true);
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const startStr = this.formatDateToYMD(new Date(year, month, 1));
    const endStr = this.formatDateToYMD(new Date(year, month + 1, 0));

    this.panchangSvc.getFestivals(startStr, endStr).pipe(
      finalize(() => this.loadingFestivals.set(false))
    ).subscribe({
      next: (res) => this.festivals.set(this.extractArray(res)),
      error: () => {
        this.festivals.set([
          { date: new Date(year, month, 11), name: 'Ekadashi Vrat', description: 'Day for fasting and internal purification. Traditional grain restraint.' },
          { date: new Date(year, month, 15), name: 'Purnima (Full Moon)', description: 'Peak moisture content in herbs and grains. Favorable for harvest.' }
        ]);
      }
    });
  }

  loadGuidanceProfile() {
    this.loadingProfile.set(true);
    this.panchangSvc.getGuidanceProfile().pipe(
      finalize(() => this.loadingProfile.set(false))
    ).subscribe({
      next: (res: any) => {
        const obj = this.extractObject(res);
        this.guidanceProfile.set(obj);
        if (obj) {
          this.profileForm.patchValue({
            rashi: obj.rashi || '',
            nakshatra: obj.nakshatra || '',
            place_of_birth: obj.place_of_birth || '',
            date_of_birth: obj.date_of_birth || '',
            time_of_birth: obj.time_of_birth || ''
          });
        }
      },
      error: () => undefined
    });
  }

  saveProfile() {
    this.savingProfile.set(true);
    this.profileMessage.set('');
    const formVal = this.profileForm.value;

    this.panchangSvc.saveGuidanceProfile(formVal).pipe(
      finalize(() => this.savingProfile.set(false))
    ).subscribe({
      next: (res: any) => {
        this.profileMessage.set('Vedic profile updated successfully. Custom agricultural recommendations enabled.');
        this.loadGuidanceProfile();
      },
      error: () => {
        this.profileMessage.set('Failed to update Vedic profile.');
      }
    });
  }

  // Format utilities
  formatDateToYMD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(dateVal: any): string {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return String(dateVal);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private extractArray(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;

    // BFS to find the first valid array
    let queue = [res];
    while (queue.length > 0) {
      const current = queue.shift();
      if (Array.isArray(current) && current.length > 0) return current;
      
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        // Prioritize known keys
        if (Array.isArray(current.data) && current.data.length > 0) return current.data;
        if (Array.isArray(current.results) && current.results.length > 0) return current.results;
        if (Array.isArray(current.muhurats) && current.muhurats.length > 0) return current.muhurats;
        if (Array.isArray(current.festivals) && current.festivals.length > 0) return current.festivals;
        
        // If not found, add children to queue
        for (const key of Object.keys(current)) {
          queue.push(current[key]);
        }
      }
    }
    return [];
  }

  private extractObject(res: any): any {
    if (res && res.data) {
      if (res.data.data) return res.data.data;
      return res.data;
    }
    return res;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate().getMonth();
  }
}

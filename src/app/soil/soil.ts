import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-soil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './soil.html',
  styleUrls: ['./soil.scss'],
})
export class Soil implements OnInit {
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);

  ngOnInit() {
    this.titleSvc.setTitle('Our Soil — 6 Years of ICBN Restoration | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: '28 acres of Sonipat farmland restored from chemical exhaustion to biological life using Indigenous Cow-Based Natural farming. Zero pesticide residue since Year 2. The full story, method, and calendar.'
    });
  }
}

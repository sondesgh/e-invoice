import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks = [
    { href: 'https://www.facebook.com/ElFatoora/', icon: 'fa-facebook', title: 'Facebook',  cssClass: 'social-facebook'  },
    { href: '',                                    icon: 'fa-twitter',  title: 'Twitter',   cssClass: 'social-twitter'   },
    { href: 'http://elfatoora.tn',                 icon: 'fa-google-plus', title: 'Google+', cssClass: 'social-gplus'   },
    { href: '',                                    icon: 'fa-linkedin', title: 'LinkedIn',  cssClass: 'social-linkedin'  },
  ];
}
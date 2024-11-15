import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TokenStorage } from './jwt/token.service';
import { environment } from 'src/env/environment';
import { User, UserRole } from './model/user.model';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Registration } from './model/registration.model';
import { AuthenticationResponse } from './model/authentication-response.model';
import { Login } from './model/login.model';
import { PasswordChange } from './model/password-change.model';
import { AccountRegistration } from './model/sys-admin-registration.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$ = new BehaviorSubject<User>({email: "", id: 0, role: 0 });

  constructor(private http: HttpClient,
    private tokenStorage: TokenStorage,
    private router: Router) { }

  login(login: Login): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(environment.apiHost + 'users/login', login)
      .pipe(
        tap((authenticationResponse) => {
          if(authenticationResponse.id == -1 && authenticationResponse.accessToken == "ForcePasswordReset"){
              this.router.navigate(['change-password'])
          }
          this.tokenStorage.saveAccessToken(authenticationResponse.accessToken);
          this.setUser();
        })
      );
  }

  register(registration: Registration): Observable<AuthenticationResponse> {
    return this.http
    .post<AuthenticationResponse>(environment.apiHost + 'users/register', registration)
    .pipe(
      tap((authenticationResponse) => {
        this.tokenStorage.saveAccessToken(authenticationResponse.accessToken);
        this.setUser();
      })
    );
  }

  registerSysAdmin(registration: AccountRegistration): Observable<AuthenticationResponse> {
    return this.http.post<AuthenticationResponse>(environment.apiHost + 'users/registerSysAdmin', registration)
  }

  logout(): void {
    this.router.navigate(['/login']).then(_ => {
      this.tokenStorage.clear();
      this.user$.next({email: "", id: 0, role: 0 });
      }
    );
  }

  changePassword(passwordChange: PasswordChange): Observable<boolean> {
    return this.http.put<boolean>(environment.apiHost + 'user/changePassword', passwordChange)
  }

  checkIfUserExists(): void {
    const accessToken = this.tokenStorage.getAccessToken();
    if (accessToken == null) {
      return;
    }
    this.setUser();
  }

  private setUser(): void {
    const jwtHelperService = new JwtHelperService();
    const accessToken = this.tokenStorage.getAccessToken() || "";
    const rawRole = jwtHelperService.decodeToken(accessToken)[
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ];
    const user: User = {
      id: +jwtHelperService.decodeToken(accessToken).id,
      email: jwtHelperService.decodeToken(accessToken).email,
      role: UserRole[rawRole as keyof typeof UserRole] || UserRole.employee
    };
    this.user$.next(user);
  }
}
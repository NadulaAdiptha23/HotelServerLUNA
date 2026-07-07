package com.codeWithProject.HotelServer.services.jwt;

import org.springframework.security.core.userdetails.UserDetailsService;

public interface UserService extends UserDetailsService{

    UserDetailsService userDetailsService();
}

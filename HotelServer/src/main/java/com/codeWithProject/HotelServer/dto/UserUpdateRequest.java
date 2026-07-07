package com.codeWithProject.HotelServer.dto;

import com.codeWithProject.HotelServer.enums.UserRole;
import lombok.Data;

@Data
public class UserUpdateRequest {

    private String email;

    private String password;

    private String name;

    private UserRole userRole;
}

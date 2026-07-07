package com.codeWithProject.HotelServer.services.auth;

import com.codeWithProject.HotelServer.dto.SignupRequest;
import com.codeWithProject.HotelServer.dto.UserDto;
import com.codeWithProject.HotelServer.dto.UserUpdateRequest;

import java.util.List;

public interface AuthService {

    UserDto createUser(SignupRequest signupRequest);

    List<UserDto> getAllUsers();

    UserDto getUserById(Long id);

    UserDto updateUser(Long id, UserUpdateRequest userUpdateRequest);

    void deleteUser(Long id);
}
